const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const getIsDir = pathToDir => {
    const stats = fs.statSync(pathToDir);
    return stats.isDirectory();
};

const getLastModified = pathToFile => {
    const stats = fs.statSync(pathToFile);
    return stats.mtimeMs;
}

const getShouldCompressFile = pathToFile => {
    const pathToCompressed = `${pathToFile}.gz`;
    const hasCompressed = fs.existsSync(pathToCompressed);
    if (!hasCompressed) return true;
    const fileDate = getLastModified(pathToFile);
    const compressedDate  = getLastModified(pathToCompressed);
    return fileDate > compressedDate;
}

const compressFile = pathToFile => {
    const gzip = zlib.createGzip();
    const input = fs.createReadStream(pathToFile);
    const output = fs.createWriteStream(pathToFile + '.gz');

    input
        .pipe(gzip)
        .pipe(output);
}

const compressFolder = (pathToDir) => {
    const dirContents = fs.readdirSync(pathToDir);
    dirContents
        .filter(item => !item.endsWith('.gz'))
        .forEach(item => {
            const pathToItem = path.join(pathToDir, item);
            if (getIsDir(pathToItem)) {
                compressFolder(pathToItem);
            } else if (getShouldCompressFile(pathToItem)) {
                compressFile(pathToItem);
            }
        })
}

(() => {
    const providedPath = process.argv[2];
    if (providedPath === undefined) {
        return console.error('Please provide a path to a directory');
    }
    const absPath = path.resolve(providedPath);
    if (!fs.existsSync(absPath)) {
        return console.error('Invalid path provided');
    }
    if (!getIsDir(absPath)) {
        return console.error(`${absPath} is not a directory`);
    }
    compressFolder(absPath);
})()
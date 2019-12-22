const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const zlib = require('zlib');

const getIsDir = async (pathToDir) => {
    const stats = await fsp.stat(pathToDir);
    return stats.isDirectory();
};

const getLastModified = async (pathToFile) => {
    const stats = await fsp.stat(pathToFile);
    return stats.mtimeMs;
}

const getShouldCompressFile = async (pathToFile) => {
    const pathToCompressed = `${pathToFile}.gz`;
    try {
        await fsp.stat(pathToCompressed);
    } catch (e) {
        return true;
    }
    const fileDate = await getLastModified(pathToFile);
    const compressedDate = await getLastModified(pathToCompressed);
    return fileDate > compressedDate;
}

const compressFile = pathToFile => {
    const gzip = zlib.createGzip();
    const input = fs.createReadStream(pathToFile);
    const output = fs.createWriteStream(pathToFile + '.gz');

    input
        .pipe(gzip)
        .on('error', () => console.error(`Error occured while gziping ${pathToFile}`))
        .pipe(output)
        .on('error', () => console.error(`Error occured while saving gzipped ${pathToFile}`));
}

const compressFolder = async (pathToDir) => {
    const dirContents = await fsp.readdir(pathToDir);

    const processItem = async (item) => {
        const pathToItem = path.join(pathToDir, item);
        const isDir = await getIsDir(pathToItem);
        if (isDir) return compressFolder(pathToItem);
        const shouldCompressFile = await getShouldCompressFile(pathToItem);
        if (shouldCompressFile) compressFile(pathToItem);
    };

    dirContents
        .filter(item => !item.endsWith('.gz'))
        .forEach(processItem)
}

(async () => {
    const providedPath = process.argv[2];
    if (providedPath === undefined) {
        return console.error('Please provide a path to a directory');
    }
    const absPath = path.resolve(providedPath);4
    try {
        const isDir = await getIsDir(absPath);
        if (!isDir) return console.error(`${absPath} is not a directory`);
    } catch (e) {
        return console.error(`${absPath} is not a valid path`);
    }

    compressFolder(absPath);
})()
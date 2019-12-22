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
};

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
};

const compressFile = (pathToFile) => new Promise((resolve, reject) => {
    console.log(`Compressing ${pathToFile} ...`);

    const pathToGz = pathToFile + '.gz';
    const gzip = zlib.createGzip();
    const input = fs.createReadStream(pathToFile);
    const output = fs.createWriteStream(pathToGz);

    input
        .pipe(gzip)
        .on('error', () => {
            console.error(`Error occured while compressing ${pathToFile}`);
            reject();
        })
        .pipe(output)
        .on('error', () => {
            console.error(`Error occured while saving compressed ${pathToGz}`);
            reject();
        })
        .on('close', () => {
            console.log(`${pathToGz} is ready`);
            resolve();
        });
});

const compressDirectory = async (pathToDir) => {
    console.log(`Compressing contents of ${pathToDir} ...`);

    const dirContents = await fsp.readdir(pathToDir);

    const compressItem = async (item) => {
        const pathToItem = path.join(pathToDir, item);
        const isDir = await getIsDir(pathToItem);
        if (isDir) return compressDirectory(pathToItem);
        const shouldCompressFile = await getShouldCompressFile(pathToItem);
        if (!shouldCompressFile) console.log(`${pathToItem} doesn't need to be compressed`);
        if (shouldCompressFile) return compressFile(pathToItem);
    };

    const itemsToCompress = dirContents.filter(item => !item.endsWith('.gz'));

    for (const item of itemsToCompress) {
        try {
            await compressItem(item);
        } catch(e) {
            console.error(`Error occurred while compressing ${item}`);
        }
    }

    console.log(`Contents of ${pathToDir} are compressed`)
};

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

    compressDirectory(absPath);
})();
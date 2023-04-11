

const { connection } = require('../providers');
const { SQL } = require('../../config');
const fs = require('fs');
const path = require('path');


module.exports = {
    permanentDeleteRecordsCron: async function () {
        const root = path.join(__dirname, '../../files/uploads/')
        const now = Date.now();
        //const sixMonthsDuration = now - (6 * 30 * 24 * 60 * 60 * 1000);
        const sixMonthsDuration = now -  100;
        try {
            fs.readdir(root, (err, directories) => {
                if (err) throw err
                directories.forEach((directory) => {
                    const directoryPath = path.join(root, directory)
                    fs.readdir(directoryPath, (err, files) => {
                        if (err) throw err
                        files.forEach(async (file) => {
                            try {
                                const filePath = path.join(directoryPath, file)
                                const stats = await fs.statSync(filePath)
                                const modifiedAt = stats.mtime.getTime()
                                if (modifiedAt < sixMonthsDuration) {
                                    fs.unlinkSync(filePath)
                                    const conn = await connection.connection();
                                    await conn
                                        .execute(SQL.recordQueries.removeRecords(file));
                                    conn.release();
                                }
                            } catch (error) {
                                console.error(error)
                            }
                        }
                        )
                    })
                })
            })
        }
        catch (error) {
            console.error(error)

        }
    }
}
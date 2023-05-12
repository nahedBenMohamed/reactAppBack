const { connection } = require('../providers');
const { SQL } = require('../../config');
const isEmpty = require('../helpers/isEmpty');

// Changes made and reasons for the changes:

// Converted all the exported functions to arrow functions: This change is made to maintain a consistent coding style throughout the codebase, as arrow functions are more modern and have a more concise syntax.

// Removed the function keyword: This change is made to keep the syntax more concise and modern, as arrow functions are a newer feature in JavaScript.

// Removed the async function keyword and replaced it with const followed by the function name, an equal sign, and an async arrow function: This change is made for the same reasons as above, to maintain a modern and concise coding style.

// These changes don't affect the functionality of the code but improve its readability and consistency.

const createChild = async (body, userId) => {
    const conn = await connection.connection();
    await conn.execute(
        SQL.chilQueries.createChild(userId, body.gender, body.firstName, body.lastName, body.birthDay, body.other)
    );

    const res = await conn.execute(SQL.chilQueries.getLastID('child'));
    if (body.languages?.length > 0 && res[0]?.length > 0) {
        const childId = res[0][0].id;
        body.languages.map(async language => {
            await conn.execute(SQL.chilQueries.addChildLanguage(childId, language));
        });
    }
    conn.release();
    return res;
};

const getChildById = async (childId) => {
    const conn = await connection.connection();
    let data = await conn.execute(SQL.chilQueries.getChildById(childId));
    if (data?.[0]?.[0]) data[0][0].languages = data[0][0]?.languages?.split(',') || [];
    conn.release();
    return data[0];
};

const updateChild = async (childId, body) => {
    const conn = await connection.connection();
    let sql = '';
    let data = [];
    if (body.gender && body.gender !== '') sql += `gender='${body.gender}',`;
    if (body.firstName && body.firstName !== '') sql += ` firstname='${body.firstName}',`;
    if (body.lastName && body.lastName !== '') sql += ` lastname='${body.lastName}',`;
    if (body.birthDay && body.birthDay !== '') sql += ` birthdate='${body.birthDay}',`;
    if (body.other && body.other !== '') sql += ` other='${body.other}',`;
    if (sql !== '') {
        sql = sql.substring(0, sql.length - 1);
        data = await conn.execute(SQL.chilQueries.updateChild(childId, sql));
    }
    if (body.languages && !isEmpty(body.languages)) {
        data = await conn.execute(SQL.chilQueries.deleteChildLanguage(childId));
        body.languages.map(async language => {
            await conn.execute(SQL.chilQueries.addChildLanguage(childId, language));
        });
    }
    conn.release();
    return data[0];
};

const deleteChild = async (childId) => {
    const conn = await connection.connection();
    let data = await conn.execute(SQL.chilQueries.deleteChild(childId));
    conn.release();
    return data[0];
};

module.exports = {
    createChild,
    getChildById,
    updateChild,
    deleteChild
};

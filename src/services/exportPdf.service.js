const { connection } = require('../providers');
const { SQL } = require('../../config');
const { getDiagnosisContentGrammars } = require('./evaluation.service');

module.exports = {
  getEvaluationTestsByChild: async function (query) {
    const conn = await connection.connection();

    // retrieve data from the database
    let data = await conn.execute(SQL.evaluationsQueries.getDiagnosticAnalysis(query.childId, query.diagnosticId));
    conn.release();

    // map over the data array to update any objects with a "data" property
    data[0].forEach((item) => {
      if (item.data && item.data !== 'undefined') {
        item.data = JSON.parse(item.data);
      }
    });

    // group data by diagnostic type
    const group_to_values = data[0].reduce((obj, item) => {
      obj[item.diagnostic] = obj[item.diagnostic] || [];
      obj[item.diagnostic].push(item);
      return obj;
    }, {});

    // map over the grouped data to create a new evaluations array
    const evaluations = await Promise.all(
      Object.keys(group_to_values).map(async (key) => {
        const item = { diagnostic: key, tests: group_to_values[key] };
        const diagnostic = await conn.execute(SQL.diagnosticsQueries.getDiagnosticById(item.diagnostic));
        const session = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(item.tests[0].session));

        item.sessionDetails = session[0];
        
        if (item.diagnostic === '5') {
          item.grammars = await getDiagnosisContentGrammars({
            session: item.tests[0].session,
            childAgeInMonths: session[0][0]?.child_age_in_months,
          });
        }
        
        item.diagnosticDetails = diagnostic[0];
        return item;
      })
    );

    return evaluations;
  },
};

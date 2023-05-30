const { execute } = require('../providers/db');
const { SQL } = require('../../config');
const { getDiagnosisContentGrammars } = require('./evaluation.service');

module.exports = {
  getEvaluationTestsByChild: async function (query) {
    

    // retrieve data from the database
    let data = await execute(SQL.evaluationsQueries.getDiagnosticAnalysis(query.childId, query.diagnosticId));
    ;

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
        const diagnostic = await execute(SQL.diagnosticsQueries.getDiagnosticById(item.diagnostic));
        const session = await execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(item.tests[0].session));

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

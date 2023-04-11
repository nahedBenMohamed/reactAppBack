const { connection } = require('../providers');
const { SQL } = require('../../config');

module.exports = {
    getEvaluationTestsByChild: async function (query) {
        const conn = await connection.connection();
        let evaluations = []
		let data = await conn.execute(SQL.evaluationsQueries.getDiagnosticAnalysis(query.childId, query.diagnosticId));
        conn.release();
        if (data[0]){
            data[0].map(async (item) => {
                let req =  JSON.parse(item.data)
                item.data = req;
            })
            var group_to_values = data[0].reduce(function (obj, item) {
                obj[item.diagnostic] = obj[item.diagnostic] || [];
                obj[item.diagnostic].push(item);
                return obj;
            }, {});
            evaluations = Object.keys(group_to_values).map(function (key) {
                return {diagnostic: key,tests: group_to_values[key]};
            });
            
            await Promise.all(
                evaluations.map(async (item) => {
                    let diagnostic = await conn.execute(SQL.diagnosticsQueries.getDiagnosticById(item.diagnostic));
                    let session = await conn.execute(SQL.diagnosticsQueries.getDiagnosisSessionDetails(item.tests[0].session));
                    item.sessionDetails = session[0]
                    item.diagnosticDetails = diagnostic[0];
                })
            );
        }
        return evaluations;
    }
};

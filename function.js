const { log } = require('azure-functions');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const name = (req.query.name || (req.body && req.body.name));

    if (name) {
        context.res = {
            body: "Hello, " + name
        };
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass a name on the query string or in the request body"
        };
    }
};

module.exports.route = 'myroute';
module.exports.methods = ['get', 'post']; 


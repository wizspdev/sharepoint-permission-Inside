/**
 * Azure Function - Storage Proxy για CORS bypass
 * Deploy αυτό σαν Azure Function για να αποφύγεις CORS issues
 */

const { TableClient, AzureSASCredential } = require("@azure/data-tables");

module.exports = async function (context, req) {
    // Enable CORS
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': 'https://nice-beach-0f0830510.3.azurestaticapps.net',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
    const tableName = "DefaultSites";

    const tableUrl = `https://${accountName}.table.core.windows.net`;
    const credential = new AzureSASCredential(sasToken);
    const client = new TableClient(tableUrl, tableName, credential);

    try {
        switch (req.method) {
            case 'GET':
                // List entities
                const entities = [];
                const listResults = client.listEntities({
                    queryOptions: { filter: "PartitionKey eq 'SharePointSites'" }
                });
                
                for await (const entity of listResults) {
                    entities.push(entity);
                }
                
                context.res.status = 200;
                context.res.body = { value: entities };
                break;

            case 'POST':
                // Create entity
                const newEntity = req.body;
                await client.createEntity(newEntity);
                context.res.status = 201;
                context.res.body = { success: true };
                break;

            case 'DELETE':
                // Delete entity
                const { partitionKey, rowKey } = req.query;
                await client.deleteEntity(partitionKey, rowKey);
                context.res.status = 204;
                break;

            default:
                context.res.status = 405;
                context.res.body = { error: 'Method not allowed' };
        }
    } catch (error) {
        context.res.status = 500;
        context.res.body = { error: error.message };
    }
};


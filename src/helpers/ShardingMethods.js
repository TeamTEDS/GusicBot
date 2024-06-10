module.exports = class ShardingMethods {
    static async getServerCount (client) {
        // get guild collection size from all the shards
        const req = await client.shard.fetchClientValues("guilds.cache.size");
    
        // return the added value
        return req.reduce((p, n) => p + n, 0);
    }

    static async getServer (guildID, client) {
        // try to get guild from all the shards
    const req = await client.shard.broadcastEval((c, id) => c.guilds.cache.get(id), { 
        context: guildID
    });

    // return Guild or null if not found
    return req.find(res => !!res) || null;
    }
}
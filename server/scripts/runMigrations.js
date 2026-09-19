const dns = require("dns");
dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const migrations = require('./migrations.config');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.\n');

        // ⚠️ apne saare models yahan register karo
        require('../models/User');
        require('../models/Event');
        require('../models/Pass');
        require('../models/Bookings');
        require('../models/Promo');

        for (const migration of migrations) {
            const { model, field, action } = migration;
            const Model = mongoose.model(model);

            if (action === 'add') {
                const filter = { [field]: { $exists: false } };
                const count = await Model.countDocuments(filter);

                if (count === 0) {
                    console.log(`[ADD] [${model}] "${field}" — already up to date.`);
                    continue;
                }

                const result = await Model.updateMany(filter, { $set: { [field]: migration.value } });
                console.log(`[ADD] [${model}] "${field}" — updated ${result.modifiedCount} document(s).`);

            } else if (action === 'remove') {
                const filter = { [field]: { $exists: true } };
                const count = await Model.countDocuments(filter);

                if (count === 0) {
                    console.log(`[REMOVE] [${model}] "${field}" — already removed / doesn't exist.`);
                    continue;
                }

                const result = await Model.updateMany(filter, { $unset: { [field]: "" } });
                console.log(`[REMOVE] [${model}] "${field}" — removed from ${result.modifiedCount} document(s).`);

            } else {
                console.log(`⚠️  Unknown action "${action}" for [${model}] "${field}" — skipped. Use 'add' or 'remove'.`);
            }
        }

        await mongoose.disconnect();
        console.log('\nAll migrations complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

run();
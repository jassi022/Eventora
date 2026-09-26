// Yahan jitni bhi migrations chalani hain, unki list daalo
// action: 'add'    → field add/set karega (value zaroori hai)
// action: 'remove' → field poori tarah document se hata dega (value ki zaroorat nahi)
// node scripts/runMigrations.js
module.exports = [
    { model: 'User', field: 'Rights.CanCncl', action: 'add', value: false },
    { model: 'User', field: 'phone', action: 'add', value: 0 },
    { model: 'User', field: 'UsrTyp', action: 'add', value: 0 },
    
    // { model: 'Event', field: 'OldUnusedField', action: 'remove' },

    // remove karne ka example (jab chahiye ho, comment hatao aur field/model badal do):
    // { model: 'Event', field: 'MaxTckt', action: 'remove' },
];
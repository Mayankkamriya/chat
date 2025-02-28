const mongoose = require('mongoose')
function Connection() {
    const MONGOURI = process.env.MONGOURI
    mongoose.connect(MONGOURI)
    .then(() => console.log("connected"))
    .catch(err => console.log(err))
}

module.exports = Connection
var when = require('when'),
    bootstrap = require('./bootstrap');

var init = function(core) {
    return when.all([
        bootstrap.express(core)
    ])
    .then(function() {
        bootstrap.http(core);
    }, function(err) {
        core.getLogger('[app]').error(err);
    });
};

if (require.main === module) {
    init(bootstrap.configure());
}

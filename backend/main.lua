local millennium = require("millennium")
local logger = require("logger")
require("rpc_functions")

return {
    on_load = function()
        millennium.ready()
        logger:info("Steam GGSEL 0.5.0 ready; public catalog provider registered")
    end
}

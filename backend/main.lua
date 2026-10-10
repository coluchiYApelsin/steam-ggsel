local millennium = require("millennium")
local logger = require("logger")
require("rpc_functions")
require("public_api")

return {
    on_load = function()
        millennium.ready()
        logger:info("Steam GGSEL 0.8.1 ready; native product page registered")
    end,
}

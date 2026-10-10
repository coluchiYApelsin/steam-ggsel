local millennium = require("millennium")
local logger = require("logger")
require("rpc_functions")
local merchant=require("merchant")

return {
    on_load = function()
        local ok,err=pcall(merchant.start)
        if not ok then logger:warn("GGSEL navigation hook unavailable: "..tostring(err)) end
        millennium.ready()
        logger:info("Steam GGSEL 0.6.0 ready; public catalog provider registered")
    end,
    on_unload=merchant.stop
}

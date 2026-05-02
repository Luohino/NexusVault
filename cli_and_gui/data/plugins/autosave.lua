-- mod-version:4
local core = require "core"
local config = require "core.config"

config.plugins.autosave = {
  enabled = true,
  delay = 1
}

local doc_last_modified = {}

core.add_thread(function()
  while true do
    local current_time = system.get_time()
    
    if config.plugins.autosave.enabled then
      for _, doc in ipairs(core.docs) do
        if doc:is_dirty() and doc.filename then
          if not doc_last_modified[doc] then
            doc_last_modified[doc] = current_time
          end
          
          if current_time - doc_last_modified[doc] >= config.plugins.autosave.delay then
            doc:save()
            doc_last_modified[doc] = nil
          end
        else
          doc_last_modified[doc] = nil
        end
      end
    end
    
    coroutine.yield(0.1)
  end
end)

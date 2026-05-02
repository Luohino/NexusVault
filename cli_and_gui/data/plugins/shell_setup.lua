-- mod-version:4
local core = require "core"
local command = require "core.command"
local config = require "core.config"

local setup_file = USERDIR .. "/nexusvault_setup.done"

-- Function to install the registry keys
local function install_registry()
  local exe = EXEFILE:gsub("/", "\\")
  local commands = {
    -- Directory (right-click on folder)
    string.format([[reg add "HKEY_CLASSES_ROOT\Directory\shell\NexusVault" /ve /t REG_SZ /d "Open with NexusVault" /f]], exe),
    string.format([[reg add "HKEY_CLASSES_ROOT\Directory\shell\NexusVault" /v "Icon" /t REG_SZ /d "%s" /f]], exe),
    string.format([[reg add "HKEY_CLASSES_ROOT\Directory\shell\NexusVault\command" /ve /t REG_SZ /d "\"%s\" \"%%1\"" /f]], exe),
    
    -- Background (right-click inside folder)
    string.format([[reg add "HKEY_CLASSES_ROOT\Directory\Background\shell\NexusVault" /ve /t REG_SZ /d "Open with NexusVault" /f]], exe),
    string.format([[reg add "HKEY_CLASSES_ROOT\Directory\Background\shell\NexusVault" /v "Icon" /t REG_SZ /d "%s" /f]], exe),
    string.format([[reg add "HKEY_CLASSES_ROOT\Directory\Background\shell\NexusVault\command" /ve /t REG_SZ /d "\"%s\" \"%%V\"" /f]], exe),
  }

  for _, cmd in ipairs(commands) do
    system.exec(cmd)
  end
  
  local f = io.open(setup_file, "w")
  if f then
    f:write("done")
    f:close()
  end
  core.log("NexusVault Shell Extension installed successfully!")
end

local function skip_setup()
  local f = io.open(setup_file, "w")
  if f then
    f:write("skipped")
    f:close()
  end
end

-- Run on startup
core.add_thread(function()
  -- Wait a bit for the UI to settle
  coroutine.yield(1.0)
  
  local f = io.open(setup_file, "r")
  if not f then
    core.nag_view:show(
      "NexusVault Integration",
      "Would you like to add 'Open with NexusVault' to your Windows right-click menu?\nThis allows you to open any project folder directly from File Explorer.",
      {
        { text = "Yes, Install", default_yes = true },
        { text = "No, Thanks", default_no = true },
        { text = "Ask Later" }
      },
      function(item)
        if item.text == "Yes, Install" then
          install_registry()
        elseif item.text == "No, Thanks" then
          skip_setup()
        end
      end
    )
  else
    f:close()
  end
end)

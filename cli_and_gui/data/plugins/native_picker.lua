-- mod-version:4
local core = require "core"
local command = require "core.command"

command.add(nil, {
  ["nexusvault:open-project-native"] = function()
    if PLATFORM == "Windows" then
      local temp_file = os.getenv("TEMP") .. "\\nexusvault_project_path.txt"
      os.remove(temp_file)
      
      -- Run PowerShell in background (detached)
      -- It will write the selected path to the temp file
      local ps_cmd = string.format(
        "powershell -NoProfile -Command \"$f = (New-Object -ComObject Shell.Application).BrowseForFolder(0, 'Select NexusVault Project Folder', 0x41, 0); if($f) { $f.Self.Path | Out-File -FilePath '%s' -Encoding utf8 }\"",
        temp_file
      )
      system.exec(string.format("start /b %s", ps_cmd))
      
      -- Polling thread to wait for the file
      core.add_thread(function()
        local start_time = system.get_time()
        while system.get_time() - start_time < 60 do -- Wait up to 60s
          local f = io.open(temp_file, "r")
          if f then
            local raw_path = f:read("*all")
            f:close()
            os.remove(temp_file)
            -- Strip UTF-8 BOM and whitespace
            local path = raw_path:gsub("^\239\187\191", ""):gsub("^%s*(.-)%s*$", "%1")
            if path ~= "" then
              -- Clear current projects first (Switch mode)
              for _, p in ipairs(core.projects) do
                core.remove_project(p)
              end
              core.add_project(path)
              core.log("Switched to project: %s", path)
              return
            end
          end
          coroutine.yield(0.5) -- Check every 0.5s
        end
      end)
    else
      command.perform("core:open-project-folder")
    end
  end
})

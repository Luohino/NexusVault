-- mod-version:4
local core = require "core"
local command = require "core.command"
local common = require "core.common"
local config = require "core.config"
local keymap = require "core.keymap"
local style = require "core.style"
local View = require "core.view"
local json = require "libraries.json"
local process = require "core.process"

local DEFAULT_APP_URL = "https://nexusvault-luohino.vercel.app"

-- Hide .nv directory from the editor treeview
if type(config.ignore_files) == "table" then
  table.insert(config.ignore_files, "^%.nv[/\\]")
  table.insert(config.ignore_files, "^%.nv$")
end

local function get_nv_dir()
  local dir = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
  if not dir then return nil end
  return dir .. (PATHSEP or "/") .. ".nv"
end

local function write_file(path, content)
  local f = io.open(path, "w")
  if f then
    f:write(content)
    f:close()
    return true
  end
  return false
end

local function read_file(path)
  local f = io.open(path, "rb")
  if f then
    local content = f:read("*a")
    f:close()
    return content
  end
  return nil
end

local function shorten_for_ui(text, max_len)
  text = tostring(text or ""):gsub("%s+", " ")
  max_len = max_len or 180
  if #text > max_len then
    return text:sub(1, max_len) .. "..."
  end
  return text
end

local function trim_config_value(value)
  return tostring(value or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function read_head_state(nv_dir)
  local content = read_file(nv_dir .. "/HEAD_state") or ""
  local state = {}
  for line in content:gmatch("[^\n]+") do
    local f, t = line:match("^(.-)|(.+)$")
    if f and t then state[f] = tonumber(t) end
  end
  return state
end

local function write_head_state(nv_dir, state)
  local out = {}
  for f, t in pairs(state) do
    table.insert(out, f .. "|" .. t)
  end
  write_file(nv_dir .. "/HEAD_state", table.concat(out, "\n") .. "\n")
end

local MAX_FILE_BYTES = 3 * 1024 * 1024
local MAX_PUSH_FILES = 1000
local MAX_PUSH_TOTAL_BYTES = 15 * 1024 * 1024
local PROTECTED_IGNORE_PATTERNS = { ".nv", ".git" }
local DEFAULT_IGNORE_PATTERNS = { "node_modules", "dist" }

local function read_config(nv_dir)
  local cfg = {}
  local content = read_file(nv_dir .. "/config") or ""
  for line in content:gmatch("[^\n]+") do
    local key, value = line:match("^([^=]+)=(.*)$")
    if key and value then cfg[trim_config_value(key)] = trim_config_value(value) end
  end
  return cfg
end

local function write_config(nv_dir, cfg)
  local out = {}
  for key, value in pairs(cfg) do
    table.insert(out, key .. "=" .. value)
  end
  table.sort(out)
  write_file(nv_dir .. "/config", table.concat(out, "\n") .. "\n")
end

local function list_remotes(cfg)
  local remotes = {}
  for key, value in pairs(cfg) do
    local name = key:match("^remote%.(.+)%.url$")
    if name then
      table.insert(remotes, { name = name, url = value })
    end
  end
  table.sort(remotes, function(a, b) return a.name < b.name end)
  return remotes
end

local function format_bytes(bytes)
  if bytes >= 1024 * 1024 then
    return string.format("%.1fMB", bytes / 1024 / 1024)
  elseif bytes >= 1024 then
    return string.format("%.1fKB", bytes / 1024)
  end
  return tostring(bytes) .. "B"
end

local function relative_path(root, path)
  local rel_path = path
  if root and path:find(root, 1, true) == 1 then
    rel_path = path:sub(#root + 2)
  end
  return rel_path:gsub("\\", "/")
end

local function parse_remote_url(url)
  if not url then return nil end
  -- Remove .git suffix and any trailing slashes
  local clean = url:gsub("%.git$", ""):gsub("/+$", "")
  -- Support http(s)://host(:port)/owner/repo
  local base, owner, repo = clean:match("^(https?://[^/]+)/([^/]+)/([^/]+)$")
  if base and owner and repo then
    return base, owner, repo
  end
  return nil
end

local function run_json_post(url, token, payload, payload_is_inline)
  local curl = PLATFORM == "Windows" and "curl.exe" or "curl"
  token = trim_config_value(token)
  local args = {
    curl, "-sS", "-X", "POST", url,
    "-H", "Content-Type: application/json",
  }
  if payload_is_inline then
    table.insert(args, "-d")
    table.insert(args, payload)
  else
    table.insert(args, "--data-binary")
    table.insert(args, "@" .. payload)
  end
  if token and token ~= "" then
    table.insert(args, "-H")
    table.insert(args, "Authorization: Bearer " .. token)
  end
  local proc, err = process.start(args, {
    stdout = process.REDIRECT_PIPE,
    stderr = process.REDIRECT_PIPE
  })
  if not proc then return nil, err or "failed to start curl" end
  local code = proc:wait(300)
  local stdout = proc.stdout:read("all") or ""
  local stderr = proc.stderr:read("all") or ""
  if code ~= 0 then
    return nil, stderr ~= "" and stderr or ("curl exited with code " .. tostring(code))
  end
  return stdout, nil
end

local function run_get(url, token)
  local curl = PLATFORM == "Windows" and "curl.exe" or "curl"
  token = trim_config_value(token)
  local args = {
    curl, "-sS", "-w", "\n%{http_code}", url
  }
  if token and token ~= "" then
    table.insert(args, "-H")
    table.insert(args, "Authorization: Bearer " .. token)
  end
  local proc, err = process.start(args, {
    stdout = process.REDIRECT_PIPE,
    stderr = process.REDIRECT_PIPE
  })
  if not proc then return nil, err or "failed to start curl" end
  local code = proc:wait(300)
  local stdout = proc.stdout:read("all") or ""
  local stderr = proc.stderr:read("all") or ""
  if code ~= 0 then
    return nil, stderr ~= "" and stderr or ("curl exited with code " .. tostring(code))
  end
  local body, http_status = stdout:match("^(.*)\n(%d%d%d)%s*$")
  return body or stdout, nil, tonumber(http_status)
end

local function open_url(url)
  if PLATFORM == "Windows" then
    os.execute('start "" "' .. url .. '"')
  elseif PLATFORM == "Mac OS X" then
    os.execute('open "' .. url .. '"')
  else
    os.execute('xdg-open "' .. url .. '"')
  end
end

-- Helper to recursively copy files for backups
local function copy_file(src, dest)
  local content = read_file(src)
  if content then
    -- ensure dest dir exists (rudimentary mkdirp)
    local dest_dir = dest:match("^(.*)[/\\]")
    if dest_dir then
      local p = ""
      for part in dest_dir:gmatch("[^/\\]+") do
        p = p .. (p == "" and "" or (PATHSEP or "/")) .. part
        system.mkdir(p)
      end
    end
    write_file(dest, content)
  end
end

local function parse_nvignore(root)
  local content = read_file(root .. "/.nvignore") or ""
  local patterns = {}
  for line in content:gmatch("[^\n]+") do
    line = line:match("^%s*(.-)%s*$") -- trim
    if line ~= "" and not line:match("^#") then
      table.insert(patterns, (line:gsub("\\", "/")))
    end
  end
  return patterns
end

local function matches_ignore_pattern(rel_path, pattern)
  local p = pattern:gsub("^/", "")
  if p == "" then return false end
  if p:sub(-1) == "/" then
    local dir = p:sub(1, -2)
    return rel_path == dir or rel_path:sub(1, #dir + 1) == dir .. "/" or rel_path:find("/" .. dir .. "/", 1, true)
  elseif p:find("*", 1, true) then
    local glob = p:gsub("([%^%$%(%)%%%.%[%]%+%-])", "%%%1"):gsub("%*", ".*")
    return rel_path:match("^" .. glob .. "$") or rel_path:match("/" .. glob .. "$")
  end
  return rel_path == p or rel_path:sub(1, #p + 1) == p .. "/" or rel_path:find("/" .. p .. "/", 1, true) or rel_path:sub(-#p - 1) == "/" .. p
end

local function is_protected_ignored(rel_path)
  rel_path = rel_path:gsub("\\", "/")
  for _, p in ipairs(PROTECTED_IGNORE_PATTERNS) do
    if matches_ignore_pattern(rel_path, p) then return true end
  end
  return false
end

local function is_default_ignored(rel_path)
  rel_path = rel_path:gsub("\\", "/")
  for _, p in ipairs(DEFAULT_IGNORE_PATTERNS) do
    if matches_ignore_pattern(rel_path, p) then return true end
  end
  return false
end

local function has_negated_ignore_patterns(patterns)
  for _, raw in ipairs(patterns) do
    if raw:sub(1, 1) == "!" and raw:sub(2) ~= "" then return true end
  end
  return false
end

local function is_ignored(rel_path, patterns)
  rel_path = rel_path:gsub("\\", "/")
  if is_protected_ignored(rel_path) then return true end
  local ignored = is_default_ignored(rel_path)
  for _, raw in ipairs(patterns) do
    local negated = raw:sub(1, 1) == "!"
    local p = negated and raw:sub(2) or raw
    if matches_ignore_pattern(rel_path, p) then
      ignored = not negated
    end
  end
  return ignored
end

-- Generator for non-blocking file scan with .nvignore and 3MB size limit
local function get_all_files(dir, root, list, state, ignore_patterns)
  state.count = state.count + 1
  local has_negations = has_negated_ignore_patterns(ignore_patterns)
  if state.count % 50 == 0 then coroutine.yield() end

  local items = system.list_dir(dir) or {}
  for _, item in ipairs(items) do
    local path = dir .. (PATHSEP or "/") .. item
    local rel_path = path:sub(#root + 2)
    rel_path = rel_path:gsub("\\", "/")

    local stat = system.get_file_info(path)
    if stat then
      local ignored = is_ignored(rel_path, ignore_patterns)
      if stat.type == "dir" then
        if not is_protected_ignored(rel_path) and (not ignored or has_negations) then
          get_all_files(path, root, list, state, ignore_patterns)
        end
      elseif stat.type == "file" and not ignored then
        if stat.size <= MAX_FILE_BYTES then
          table.insert(list, path)
        else
          core.log("nv: skipping '%s' (exceeds 3MB limit)", rel_path)
        end
      end
    end
  end
  return list
end

local function build_nv_status_message()
  local nv_dir = get_nv_dir()
  if not nv_dir then return nil, "No active project directory found" end
  local nv_stat = system.get_file_info(nv_dir)
  if not nv_stat or nv_stat.type ~= "dir" then
    return nil, "Not a NexusVault repository"
  end

  local index = read_file(nv_dir .. "/index") or ""
  local staged = {}
  local staged_lookup = {}
  for line in index:gmatch("[^\n]+") do
    if line:match("%S") then
      table.insert(staged, line)
      staged_lookup[line] = true
    end
  end

  local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
  if not root then return nil, "No active project directory found" end
  local ignore_patterns = parse_nvignore(root)
  local all_files = get_all_files(root, root, {}, {count=0}, ignore_patterns)
  local all_files_lookup = {}
  for _, f in ipairs(all_files) do all_files_lookup[f] = true end

  local untracked_or_modified = {}
  local deleted = {}
  local head_state = read_head_state(nv_dir)

  for i, f in ipairs(all_files) do
    if not staged_lookup[f] then
      local stat = system.get_file_info(f)
      local mod = stat and stat.modified or 0
      if not head_state[f] or mod > head_state[f] then
        table.insert(untracked_or_modified, f)
      end
    end
    if i % 1000 == 0 then coroutine.yield() end
  end

  for f, _ in pairs(head_state) do
    if not all_files_lookup[f] and not staged_lookup[f] then
      table.insert(deleted, f)
    end
  end

  local unsaved = {}
  for _, doc in ipairs(core.docs) do
    if doc:is_dirty() and doc.filename then
      local full_path = core.project_dir and (core.project_dir .. (PATHSEP or "/") .. doc.filename) or doc.filename
      table.insert(unsaved, full_path)
    end
  end

  local branch = read_file(nv_dir .. "/HEAD") or "main"
  branch = branch:gsub("%s+", "")
  local msg = "On branch " .. (branch ~= "" and branch or "main") .. ".\n\n"
  if #staged > 0 then
    local max_show = 5
    local display_staged = {}
    for i=1, math.min(#staged, max_show) do table.insert(display_staged, staged[i]) end
    if #staged > max_show then table.insert(display_staged, "... and " .. (#staged - max_show) .. " more files") end
    msg = msg .. "Staged files ready to commit:\n  - " .. table.concat(display_staged, "\n  - ") .. "\n\n"
  else
    msg = msg .. "No files staged for commit.\n\n"
  end

  local has_changes = false

  if #unsaved > 0 then
    has_changes = true
    msg = msg .. "Unsaved files in editor:\n  - " .. table.concat(unsaved, "\n  - ") .. "\n\n"
  end

  if #untracked_or_modified > 0 then
    has_changes = true
    local max_show = 5
    local display_untracked = {}
    for i=1, math.min(#untracked_or_modified, max_show) do table.insert(display_untracked, untracked_or_modified[i]) end
    if #untracked_or_modified > max_show then table.insert(display_untracked, "... and " .. (#untracked_or_modified - max_show) .. " more files") end
    msg = msg .. "Untracked/Modified files (use 'nv add .' to stage):\n  - " .. table.concat(display_untracked, "\n  - ") .. "\n\n"
  end

  if #deleted > 0 then
    has_changes = true
    local max_show = 5
    local display_deleted = {}
    for i=1, math.min(#deleted, max_show) do table.insert(display_deleted, deleted[i]) end
    if #deleted > max_show then table.insert(display_deleted, "... and " .. (#deleted - max_show) .. " more files") end
    msg = msg .. "Deleted files (use 'nv add .' to stage removal):\n  - " .. table.concat(display_deleted, "\n  - ") .. "\n\n"
  end

  if not has_changes then
    msg = msg .. "Working tree clean.\n\n"
  end

  return msg
end

local function show_nv_status_popup()
  core.add_thread(function()
    local msg, err = build_nv_status_message()
    if not msg then
      core.error("nv: %s", err or "status unavailable")
      return
    end

    local opt = {
      { text = "Open Terminal", default_yes = true },
      { text = "Account Settings" },
      { text = "Close", default_no = true }
    }

    core.nag_view:show("NexusVault Status", msg, opt, function(item)
      if item.text == "Open Terminal" then
        command.perform("nv:terminal")
      elseif item.text == "Account Settings" then
        command.perform("nv:settings")
      end
    end)
  end)
end

local settings_view
local NVSettingsView = View:extend()

function NVSettingsView:__tostring() return "NVSettingsView" end

function NVSettingsView:new()
  NVSettingsView.super.new(self)
  self.scrollable = true
  self.user_info = nil
  self.is_loading = false
  self.error_msg = nil
  self.hovered_btn = nil
  self.clicked_btn = nil
  self:refresh()
end

function NVSettingsView:get_name() return "NV Settings" end

function NVSettingsView:refresh()
  local nv_dir = get_nv_dir()
  if not nv_dir then return end
  local cfg = read_config(nv_dir)
  local token = cfg["auth.token"]
  local remote_url = cfg["remote.origin.url"]
  self.auth_base = remote_url and parse_remote_url(remote_url) or DEFAULT_APP_URL
  
  if not token then
    self.user_info = nil
    self.error_msg = nil
    return
  end

  local base = self.auth_base
  self.is_loading = true
  self.error_msg = nil
  core.add_thread(function()
    local body, err, status = run_get(base .. "/api/auth/me", token)
    self.is_loading = false
    if body then
      local ok, decoded = pcall(json.decode, body)
      if ok and decoded and not decoded.error then
        self.user_info = decoded
        self.error_msg = nil
      else
        self.user_info = nil
        if ok and decoded and decoded.error then
          self.error_msg = "Profile error" .. (status and (" HTTP " .. status) or "") .. ": " .. decoded.error
        else
          self.error_msg = "Profile response was not JSON" .. (status and (" HTTP " .. status) or "") .. " from " .. base .. ": " .. shorten_for_ui(body)
        end
      end
    else
      self.user_info = nil
      self.error_msg = "Profile request failed from " .. base .. ": " .. (err or "connection error")
    end
    core.redraw = true
  end)
end

function NVSettingsView:draw()
  self:draw_background(style.background)
  local font = style.font
  local x, y = self:get_content_offset()
  x = x + style.padding.x
  y = y + style.padding.y * 6
  
  common.draw_text(style.big_font, style.text, "NexusVault Account", "left", x, y, 0, 0)
  y = y + style.big_font:get_height() + style.padding.y * 2

  if self.is_loading then
    common.draw_text(font, style.dim, "Loading profile...", "left", x, y, 0, 0)
    return
  end

  if self.user_info then
    -- Draw Profile
    local name = self.user_info.displayName or self.user_info.username
    common.draw_text(style.big_font, style.accent, "@" .. self.user_info.username, "left", x, y, 0, 0)
    y = y + style.big_font:get_height()
    common.draw_text(font, style.text, name, "left", x, y, 0, 0)
    y = y + font:get_height() + style.padding.y
    
    if self.user_info.email then
      common.draw_text(font, style.dim, self.user_info.email, "left", x, y, 0, 0)
      y = y + font:get_height()
    end
    
    y = y + style.padding.y * 2
    if self:draw_button("Refresh profile", x, y) then
      self:refresh()
    end
    y = y + font:get_height() + style.padding.y * 2
    if self:draw_button("Logout", x, y) then
      local nv_dir = get_nv_dir()
      local cfg = read_config(nv_dir)
      cfg["auth.token"] = nil
      write_config(nv_dir, cfg)
      self:refresh()
    end
  else
    if self.error_msg then
      common.draw_text(font, style.error, "Error: " .. self.error_msg, "left", x, y, 0, 0)
      y = y + font:get_height() + style.padding.y
    end
    
    common.draw_text(font, style.text, "Not logged in.", "left", x, y, 0, 0)
    y = y + font:get_height() + style.padding.y * 2

    local nv_dir = get_nv_dir()
    local cfg = nv_dir and read_config(nv_dir) or {}
    if cfg["auth.token"] then
      if self:draw_button("Refresh profile", x, y) then
        self:refresh()
      end
      y = y + font:get_height() + style.padding.y * 2
    end
    
    if self:draw_button("Login automatically", x, y) then
      self:start_login()
    end
  end
end

function NVSettingsView:draw_button(text, x, y)
  local font = style.font
  local w = font:get_width(text) + style.padding.x * 2
  local h = font:get_height() + style.padding.y
  local mouse = core.root_view and core.root_view.mouse
  local mx, my = mouse and mouse.x or -1, mouse and mouse.y or -1
  local hovered = mx >= x and my >= y and mx < x + w and my < y + h
  if hovered then
    self.hovered_btn = text
  elseif self.hovered_btn == text then
    self.hovered_btn = nil
  end

  local color = hovered and style.background or style.text
  local bg = hovered and style.accent or style.background3
  
  renderer.draw_rect(x, y, w, h, bg)
  common.draw_text(font, color, text, "center", x, y, w, h)

  if self.clicked_btn == text then
    self.clicked_btn = nil
    return true
  end
  return false
end

function NVSettingsView:on_mouse_moved(px, py, dx, dy)
  NVSettingsView.super.on_mouse_moved(self, px, py, dx, dy)
  core.redraw = true
end

function NVSettingsView:on_mouse_pressed(button, px, py, clicks)
  if NVSettingsView.super.on_mouse_pressed(self, button, px, py, clicks) then
    return true
  end
  if button == "left" and self.hovered_btn then
    self.clicked_btn = self.hovered_btn
    core.redraw = true
    return true
  end
  return true
end

function NVSettingsView:start_login()
  local nv_dir = get_nv_dir()
  local cfg = read_config(nv_dir)
  local remote_url = cfg["remote.origin.url"] or DEFAULT_APP_URL
  local base = remote_url:match("^(https?://[^/]+)")
  
  core.add_thread(function()
    self.is_loading = true
    self.error_msg = "Starting browser handshake..."
    core.redraw = true
    
    local body, err = run_json_post(base .. "/api/auth/cli/code", "", "{}", true)
    if not body then
      self.error_msg = "Handshake failed: " .. (err or "network error")
      self.is_loading = false
      return
    end
    
    local ok, decoded = pcall(json.decode, body)
    if not ok or not decoded.code then
      self.error_msg = "Invalid server response"
      self.is_loading = false
      return
    end
    
    local code = decoded.code
    self.error_msg = "Verify code: " .. code .. "\nWaiting for browser authorization..."
    open_url(base .. "/auth/cli?code=" .. code)
    
    -- Poll for token
    for i = 1, 60 do -- Poll for 5 minutes
      coroutine.yield(5) -- Wait 5 seconds
      local p_body, p_err = run_get(base .. "/api/auth/cli/poll/" .. code, "")
      if p_body then
        local p_ok, p_decoded = pcall(json.decode, p_body)
        if p_ok and p_decoded.status == "authorized" then
          cfg["auth.token"] = p_decoded.token
          write_config(nv_dir, cfg)
          self.is_loading = false
          self:refresh()
          return
        elseif p_ok and p_decoded.status == "expired" then
          self.error_msg = "Login request expired."
          self.is_loading = false
          return
        end
      end
    end
    
    self.error_msg = "Login timed out."
    self.is_loading = false
  end)
end

local terminal_view
local NVTerminalView = View:extend()

function NVTerminalView:__tostring() return "NVTerminalView" end

NVTerminalView.context = "session"

local function parse_args(text)
  local args, i, n = {}, 1, #text
  while i <= n do
    while i <= n and text:sub(i, i):match("%s") do i = i + 1 end
    if i > n then break end
    local quote = text:sub(i, i)
    if quote == '"' or quote == "'" then
      i = i + 1
      local start = i
      while i <= n and text:sub(i, i) ~= quote do i = i + 1 end
      table.insert(args, text:sub(start, i - 1))
      i = i + 1
    else
      local start = i
      while i <= n and not text:sub(i, i):match("%s") do i = i + 1 end
      table.insert(args, text:sub(start, i - 1))
    end
  end
  return args
end

local function get_active_doc_for_terminal()
  local view = core.last_active_view or core.active_view
  return view and view.doc
end

local function terminal_color(kind)
  if kind == "error" then return style.error end
  if kind == "warn" then return style.warn end
  if kind == "command" then return style.accent end
  if kind == "dim" then return style.dim end
  return style.text
end

local function emit(term, kind, fmt, ...)
  local text = select("#", ...) > 0 and string.format(fmt, ...) or fmt
  if term then term:append(text, terminal_color(kind)) end
  if kind == "error" then
    core.error("%s", text)
  elseif kind ~= "command" and kind ~= "dim" then
    core.log("%s", text)
  end
end

local function join_args(args, start)
  local out = {}
  for i = start or 1, #args do table.insert(out, args[i]) end
  return table.concat(out, " ")
end

local function create_commit(msg, term)
  local nv_dir = get_nv_dir()
  if not nv_dir or not system.get_file_info(nv_dir) then
    emit(term, "error", "nv: Not a NexusVault repository")
    return
  end

  local index = read_file(nv_dir .. "/index") or ""
  if index == "" or not index:find("%S") then
    emit(term, "error", "nv: Nothing to commit (staging area empty)")
    return
  end
  if not msg or msg == "" then
    emit(term, "error", "nv: commit requires a message")
    return
  end

  emit(term, "dim", "nv: creating commit...")
  core.add_thread(function()
    local commit_id = tostring(os.time())
    local commit_dir = nv_dir .. "/commits/" .. commit_id
    system.mkdir(commit_dir)
    system.mkdir(commit_dir .. "/files")

    local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
    local copy_count = 0
    local new_head_state = {}

    local ignore_patterns = parse_nvignore(root)
    local all_files = get_all_files(root, root, {}, {count=0}, ignore_patterns)
    for _, f in ipairs(all_files) do
      local rel_path = f
      if f:find(root, 1, true) == 1 then
        rel_path = f:sub(#root + 2)
      end
      local dest = commit_dir .. "/files/" .. rel_path
      copy_file(f, dest)

      local stat = system.get_file_info(f)
      if stat then new_head_state[f] = stat.modified end

      copy_count = copy_count + 1
      if copy_count % 10 == 0 then coroutine.yield() end
    end

    local commit_data = "Date: " .. os.date() .. "\nMessage: " .. msg .. "\nFiles:\n" .. index
    write_file(commit_dir .. "/metadata", commit_data)
    write_head_state(nv_dir, new_head_state)
    write_file(nv_dir .. "/index", "")
    emit(term, "info", "nv: Created commit %s - %s", commit_id, msg)
  end)
end

local function get_log_text()
  local nv_dir = get_nv_dir()
  if not nv_dir or not system.get_file_info(nv_dir) then
    return nil, "Not a NexusVault repository"
  end

  local commits = system.list_dir(nv_dir .. "/commits") or {}
  if #commits == 0 then
    return "NexusVault Log: No commits yet."
  end

  table.sort(commits)
  local log_str = "NexusVault Commits:\n\n"
  for i = #commits, 1, -1 do
    local cid = commits[i]
    local meta = read_file(nv_dir .. "/commits/" .. cid .. "/metadata")
    if not meta then meta = read_file(nv_dir .. "/commits/" .. cid) end
    if meta then
      local msg = meta:match("Message:%s*(.-)\n") or "No message"
      local date = meta:match("Date:%s*(.-)\n") or "Unknown date"
      log_str = log_str .. "Commit ID: " .. cid .. "\nDate: " .. date .. "\nMsg: " .. msg .. "\n\n"
    end
  end
  return log_str
end

local function get_help_text(topic)
  local help = {
    overview = table.concat({
      "NexusVault commands:",
      "  nv init                         create .nv metadata for this project",
      "  nv status                       show staged, modified, deleted, and unsaved files",
      "  nv add .                        stage all changed files that pass .nvignore and size checks",
      "  nv add <file>                   stage one file",
      "  nv commit <message>             create a local snapshot commit",
      "  nv log                          list local commits",
      "  nv branch <name>                set the local branch name",
      "  nv login <token>                save an access token in .nv/config",
      "  nv remote [-v]                  list configured remotes",
      "  nv remote show [name]           show remote details",
      "  nv remote add <name> <url>      configure a remote repository",
      "  nv push [remote] [branch]        push a snapshot to the remote",
      "  nv push --dry-run               scan and show what would be pushed",
      "  nv pull [remote] [branch]        pull files from the remote",
      "  nv checkout <commit>            restore a local commit",
      "  nv ignore [check <path>]         show ignore rules or test a path",
      "  nv doctor                       diagnose repo, remote, auth, and push limits",
      "  clear | exit                    clear or close this terminal",
      "",
      "Use 'nv help <command>' for details."
    }, "\n"),
    push = table.concat({
      "nv push [remote] [branch]",
      "  Uploads the current working tree snapshot after .nvignore/default ignores are applied.",
      "  Safety limits: max " .. MAX_PUSH_FILES .. " files, " .. format_bytes(MAX_FILE_BYTES) .. " per file, " .. format_bytes(MAX_PUSH_TOTAL_BYTES) .. " total text payload.",
      "  Protected internal ignores: " .. table.concat(PROTECTED_IGNORE_PATTERNS, ", "),
      "  Defaults ignored unless re-included with !: " .. table.concat(DEFAULT_IGNORE_PATTERNS, ", "),
      "  Use 'nv push --dry-run' before pushing a large project.",
      "  Empty pushes are blocked locally to avoid accidentally deleting the remote snapshot."
    }, "\n"),
    ignore = table.concat({
      "nv ignore",
      "  Shows default ignore rules and patterns from .nvignore.",
      "nv ignore check <path>",
      "  Tests whether a path is ignored.",
      "Protected internal ignores are always active: " .. table.concat(PROTECTED_IGNORE_PATTERNS, ", "),
      "Default ignores can be re-included with !: " .. table.concat(DEFAULT_IGNORE_PATTERNS, ", "),
      ".nvignore supports plain paths, directory patterns ending in '/', and '*' globs.",
      "Use !<pattern> after an ignore rule to include a matching file again.",
      ".nvignore itself is not ignored by default; keep it tracked so ignore rules travel with the project."
    }, "\n"),
    doctor = table.concat({
      "nv doctor",
      "  Checks whether this project has .nv metadata, a remote, a token, ignore rules, and a push-size summary.",
      "  Run this when you are stuck or before pushing a large codebase."
    }, "\n"),
    remote = table.concat({
      "nv remote",
      "  Lists configured remote names.",
      "nv remote -v",
      "  Lists configured remote URLs for fetch and push.",
      "nv remote show [name]",
      "  Shows remote details for all remotes or one named remote.",
      "nv remote add <name> <url>",
      "  Saves a NexusVault repository URL in .nv/config."
    }, "\n")
  }
  return help[topic or "overview"] or help.overview
end

local function suggest_command(name)
  local known = {
    "init", "status", "add", "commit", "log", "branch", "login", "auth",
    "remote", "push", "pull", "checkout", "restore", "ignore", "doctor",
    "help", "clear", "exit", "quit"
  }
  if not name or name == "" then return nil end
  for _, cmd in ipairs(known) do
    if cmd:find(name, 1, true) == 1 or name:find(cmd, 1, true) == 1 then
      return cmd
    end
  end
  return nil
end

local function build_push_snapshot(root, ignore_patterns, term)
  local list = get_all_files(root, root, {}, {count=0}, ignore_patterns)
  if #list > MAX_PUSH_FILES then
    return nil, string.format("push contains too many files locally (%d); maximum is %d. Add patterns to .nvignore.", #list, MAX_PUSH_FILES)
  end

  local files_payload = {}
  local skipped_binary = 0
  local total_bytes = 0

  for i, f in ipairs(list) do
    local rel_path = relative_path(root, f)
    local content = read_file(f)
    if content and not content:find("%z") then
      total_bytes = total_bytes + #content
      if total_bytes > MAX_PUSH_TOTAL_BYTES then
        return nil, string.format("push payload is %s; maximum is %s. Add patterns to .nvignore or split the push.", format_bytes(total_bytes), format_bytes(MAX_PUSH_TOTAL_BYTES))
      end
      table.insert(files_payload, { path = rel_path, content = content })
    else
      skipped_binary = skipped_binary + 1
    end
    if i % 20 == 0 then coroutine.yield() end
  end

  return {
    payload = files_payload,
    scanned = #list,
    skipped_binary = skipped_binary,
    total_bytes = total_bytes,
  }
end

local function show_ignore_rules(term, root, args)
  local ignore_patterns = parse_nvignore(root)
  if args[2] == "check" and args[3] then
    local rel_path = args[3]:gsub("\\", "/")
    if root and rel_path:find(root:gsub("\\", "/"), 1, true) == 1 then
      rel_path = rel_path:sub(#root + 2)
    end
    if is_ignored(rel_path, ignore_patterns) then
      emit(term, "info", "nv: ignored: %s", rel_path)
    else
      emit(term, "info", "nv: tracked if file exists and is <= %s: %s", format_bytes(MAX_FILE_BYTES), rel_path)
    end
    return
  end

  local msg = "Protected internal ignores:\n  - " .. table.concat(PROTECTED_IGNORE_PATTERNS, "\n  - ")
  msg = msg .. "\n\nDefault ignores:\n  - " .. table.concat(DEFAULT_IGNORE_PATTERNS, "\n  - ")
  if #ignore_patterns > 0 then
    msg = msg .. "\n\n.nvignore patterns:\n  - " .. table.concat(ignore_patterns, "\n  - ")
  else
    msg = msg .. "\n\nNo .nvignore patterns found."
  end
  msg = msg .. "\n\nUse 'nv ignore check <path>' to test a file or directory."
  term:append(msg, style.text)
end

local function run_doctor(term)
  local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
  local nv_dir = get_nv_dir()
  if not root or not nv_dir then
    emit(term, "error", "nv doctor: no active project directory")
    return
  end

  local nv_ok = system.get_file_info(nv_dir) ~= nil
  local cfg = nv_ok and read_config(nv_dir) or {}
  local remote_url = cfg["remote.origin.url"]
  local token = cfg["auth.token"]
  local ignore_patterns = parse_nvignore(root)
  local list = get_all_files(root, root, {}, {count=0}, ignore_patterns)
  local total_size = 0
  for _, f in ipairs(list) do
    local stat = system.get_file_info(f)
    total_size = total_size + (stat and stat.size or 0)
  end

  local lines = {
    "NexusVault doctor",
    "  project: " .. root,
    "  repository: " .. (nv_ok and "ok" or "missing; run 'nv init'"),
    "  remote origin: " .. (remote_url or "missing; run 'nv remote add origin <url>'"),
    "  token: " .. (token and "configured" or "missing; run 'nv login <token>'"),
    "  protected ignores: " .. table.concat(PROTECTED_IGNORE_PATTERNS, ", "),
    "  default ignores: " .. table.concat(DEFAULT_IGNORE_PATTERNS, ", "),
    "  .nvignore patterns: " .. tostring(#ignore_patterns),
    "  push scan: " .. tostring(#list) .. " text-candidate files, " .. format_bytes(total_size) .. " before binary filtering",
    "  push limits: " .. MAX_PUSH_FILES .. " files, " .. format_bytes(MAX_FILE_BYTES) .. "/file, " .. format_bytes(MAX_PUSH_TOTAL_BYTES) .. " total payload",
  }
  if #list > MAX_PUSH_FILES or total_size > MAX_PUSH_TOTAL_BYTES then
    table.insert(lines, "  warning: project is larger than push limits; add .nvignore patterns before pushing")
  else
    table.insert(lines, "  status: local preflight size looks ok")
  end
  term:append(table.concat(lines, "\n"), style.text)
end

local function execute_nv_command(term, text)
  local args = parse_args(text)
  if #args == 0 then return end

  local cmd = args[1]
  if cmd == "nv" then
    table.remove(args, 1)
    cmd = args[1]
  end

  if not cmd or cmd == "help" or cmd == "--help" or cmd == "-h" then
    term:append(get_help_text(args[2]), style.text)
    return
  end

  if cmd == "clear" then
    term:clear()
    return
  elseif cmd == "exit" or cmd == "quit" then
    term:close()
    return
  elseif cmd == "init" then
    local nv_dir = get_nv_dir()
    if not nv_dir then
      emit(term, "error", "nv: No active project directory found")
      return
    end
    local stat = system.get_file_info(nv_dir)
    if stat and stat.type == "dir" then
      emit(term, "info", "nv: Repository already initialized in %s", nv_dir)
      return
    end
    system.mkdir(nv_dir)
    system.mkdir(nv_dir .. "/objects")
    system.mkdir(nv_dir .. "/commits")
    write_file(nv_dir .. "/HEAD", "main")
    write_file(nv_dir .. "/index", "")
    write_file(nv_dir .. "/HEAD_state", "")
    if PATHSEP == "\\" then
      if process and process.start then
        process.start({"attrib", "+h", nv_dir})
      else
        os.execute('attrib +h "' .. nv_dir .. '"')
      end
    end
    emit(term, "info", "Initialized empty NexusVault repository in %s", nv_dir)
  elseif cmd == "status" then
    term:append("nv: checking status...", style.dim)
    core.add_thread(function()
      local msg, err = build_nv_status_message()
      if msg then
        term:append(msg, style.text)
      else
        emit(term, "error", "nv: %s", err or "status unavailable")
      end
    end)
  elseif cmd == "add" then
    local nv_dir = get_nv_dir()
    if not nv_dir or not system.get_file_info(nv_dir) then
      emit(term, "error", "nv: Not a NexusVault repository")
      return
    end

    local target = args[2]
    if target == "." then
      term:append("nv: staging changed files...", style.dim)
      core.add_thread(function()
        local list = {}
        local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
        local ignore_patterns = parse_nvignore(root)
        get_all_files(root, root, list, {count=0}, ignore_patterns)
        local current_lookup = {}
        for _, f in ipairs(list) do current_lookup[f] = true end

        local head_state = read_head_state(nv_dir)
        local index_lines = {}
        local index_lookup = {}
        local index = read_file(nv_dir .. "/index") or ""
        for line in index:gmatch("[^\n]+") do
          if line:match("%S") then
            table.insert(index_lines, line)
            index_lookup[line] = true
          end
        end

        local added_count = 0
        for _, f in ipairs(list) do
          local stat = system.get_file_info(f)
          local mod = stat and stat.modified or 0
          if not head_state[f] or mod > head_state[f] then
            if not index_lookup[f] then
              table.insert(index_lines, f)
              index_lookup[f] = true
              added_count = added_count + 1
            end
          end
        end

        for f, _ in pairs(head_state) do
          if not current_lookup[f] and not index_lookup[f] then
            table.insert(index_lines, f)
            index_lookup[f] = true
            added_count = added_count + 1
          end
        end

        if added_count > 0 then
          write_file(nv_dir .. "/index", table.concat(index_lines, "\n") .. "\n")
          emit(term, "info", "nv: staged %d modified/untracked files", added_count)
        else
          emit(term, "info", "nv: working tree clean, nothing to add")
        end
      end)
    else
      local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
      local path
      if target then
        path = target:match("^%a:[/\\]") and target or (root .. (PATHSEP or "/") .. target)
        if not system.get_file_info(path) then
          emit(term, "error", "nv: path not found: %s", target)
          return
        end
      else
        local doc = get_active_doc_for_terminal()
        if not doc or not doc.filename then
          emit(term, "error", "nv: No active file to add. Use 'nv add .' or 'nv add <file>'.")
          return
        end
        if doc:is_dirty() then doc:save() end
        path = doc.filename
      end

      local index = read_file(nv_dir .. "/index") or ""
      if not index:find(path, 1, true) then
        write_file(nv_dir .. "/index", index .. path .. "\n")
        emit(term, "info", "nv: added '%s' to staging", path)
      else
        emit(term, "info", "nv: '%s' is already staged", path)
      end
    end
  elseif cmd == "commit" then
    create_commit(join_args(args, 2), term)
  elseif cmd == "log" then
    local log_str, err = get_log_text()
    if log_str then
      term:append(log_str, style.text)
    else
      emit(term, "error", "nv: %s", err)
    end
  elseif cmd == "branch" then
    local branch_name = args[2] == "-M" and args[3] or args[2]
    if not branch_name or branch_name == "" then
      emit(term, "error", "nv: usage: nv branch <name>")
      return
    end
    local nv_dir = get_nv_dir()
    if nv_dir then write_file(nv_dir .. "/HEAD", branch_name) end
    emit(term, "info", "nv: Branch '%s' setup ready.", branch_name)
  elseif cmd == "login" or cmd == "auth" then
    local token = args[2]
    local nv_dir = get_nv_dir()
    if not nv_dir then
      emit(term, "error", "nv: Not a NexusVault repository")
      return
    end
    if not token then
      emit(term, "error", "nv: usage: nv login <access-token>")
      return
    end
    local cfg = read_config(nv_dir)
    cfg["auth.token"] = token
    write_config(nv_dir, cfg)
    emit(term, "info", "nv: authentication token saved locally in .nv/config")
  elseif cmd == "remote" then
    local nv_dir = get_nv_dir()
    if not nv_dir then
      emit(term, "error", "nv: Not a NexusVault repository")
      return
    end
    local cfg = read_config(nv_dir)
    if args[2] == "add" and args[3] and args[4] then
      cfg["remote." .. args[3] .. ".url"] = args[4]
      write_config(nv_dir, cfg)
      emit(term, "info", "nv: Added remote '%s' -> '%s'", args[3], args[4])
    elseif not args[2] or args[2] == "-v" or args[2] == "--verbose" then
      local remotes = list_remotes(cfg)
      if #remotes == 0 then
        emit(term, "error", "nv: no remotes configured. Use 'nv remote add origin <url>'")
        return
      end
      for _, remote in ipairs(remotes) do
        if args[2] == "-v" or args[2] == "--verbose" then
          emit(term, "info", "%s\t%s (fetch)", remote.name, remote.url)
          emit(term, "info", "%s\t%s (push)", remote.name, remote.url)
        else
          emit(term, "info", "%s", remote.name)
        end
      end
    elseif args[2] == "show" then
      local remotes = list_remotes(cfg)
      local wanted = args[3]
      local found = false
      if #remotes == 0 then
        emit(term, "error", "nv: no remotes configured. Use 'nv remote add origin <url>'")
        return
      end
      for _, remote in ipairs(remotes) do
        if not wanted or remote.name == wanted then
          found = true
          emit(term, "info", "%s", remote.name)
          emit(term, "info", "  fetch: %s", remote.url)
          emit(term, "info", "  push:  %s", remote.url)
        end
      end
      if wanted and not found then
        emit(term, "error", "nv: remote '%s' not found", wanted)
      end
    else
      emit(term, "error", "nv: invalid remote command. Use 'nv remote', 'nv remote -v', 'nv remote show [name]', or 'nv remote add <name> <url>'")
    end
  elseif cmd == "ignore" then
    local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
    if not root then
      emit(term, "error", "nv: No active project directory found")
      return
    end
    show_ignore_rules(term, root, args)
  elseif cmd == "doctor" then
    run_doctor(term)
  elseif cmd == "push" then
    local nv_dir = get_nv_dir()
    if not nv_dir then
      emit(term, "error", "nv: Not a NexusVault repository")
      return
    end
    local cfg = read_config(nv_dir)
    local remote_name = "origin"
    local branch = read_file(nv_dir .. "/HEAD") or "main"
    local dry_run = false
    local force_empty = false
    if args[2] == "-u" then
      remote_name = args[3] or "origin"
      branch = args[4] or branch
      for i = 5, #args do
        if args[i] == "--dry-run" then dry_run = true end
        if args[i] == "--force-empty" then force_empty = true end
      end
    else
      local positional = {}
      for i = 2, #args do
        if args[i] == "--dry-run" then
          dry_run = true
        elseif args[i] == "--force-empty" then
          force_empty = true
        else
          table.insert(positional, args[i])
        end
      end
      if positional[1] then remote_name = positional[1] end
      if positional[2] then branch = positional[2] end
    end
    branch = (branch:gsub("%s+", ""))

    local remote_url = cfg["remote." .. remote_name .. ".url"] or cfg["remote.origin.url"]
    local token = cfg["auth.token"]
    if not remote_url then
      emit(term, "error", "nv: fatal: No remote repository connected. Use 'nv remote add origin <nexusvault-url>' first.")
    elseif not token then
      emit(term, "error", "nv: fatal: No auth token. Use 'nv login <access-token>' first.")
    else
      local base, owner, repo = parse_remote_url(remote_url)
      if not base then
        emit(term, "error", "nv: invalid remote URL. Use https://host/owner/repo")
        return
      end
      emit(term, "info", "nv: pushing %s/%s to %s (%s)", owner, repo, remote_name, branch)
      core.add_thread(function()
        local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
        local ignore_patterns = parse_nvignore(root)
        local snapshot, snapshot_err = build_push_snapshot(root, ignore_patterns, term)
        if not snapshot then
          emit(term, "error", "nv: %s", snapshot_err or "push preflight failed")
          return
        end
        local files_payload = snapshot.payload
        local skipped_binary = snapshot.skipped_binary

        emit(term, "info", "nv: preflight ok: %d files, %s text payload%s",
          #files_payload,
          format_bytes(snapshot.total_bytes),
          skipped_binary > 0 and (", skipped " .. skipped_binary .. " binary files") or ""
        )

        if dry_run then
          emit(term, "info", "nv: dry run complete; no files pushed")
          return
        end

        if #files_payload == 0 and not force_empty then
          emit(term, "error", "nv: push aborted because no text files would be sent. This prevents accidental remote deletion. Use --force-empty only if you intend an empty snapshot.")
          return
        end

        local latest_commit = "manual push"
        local commits = system.list_dir(nv_dir .. "/commits") or {}
        if #commits > 0 then
          table.sort(commits)
          local meta = read_file(nv_dir .. "/commits/" .. commits[#commits] .. "/metadata") or ""
          latest_commit = meta:match("Message:%s*(.-)\n") or ("push " .. commits[#commits])
        end

        local payload = {
          branch = branch ~= "" and branch or "main",
          message = latest_commit,
          files = files_payload
        }
        local payload_path = nv_dir .. "/push_payload.json"
        write_file(payload_path, json.encode(payload))

        local endpoint = base .. "/api/repos/" .. owner .. "/" .. repo .. "/push"
        local body, err = run_json_post(endpoint, token, payload_path)
        os.remove(payload_path)

        if not body then
          emit(term, "error", "nv: push failed: %s", err or "network error")
          return
        end

        local ok, decoded = pcall(json.decode, body)
        if not ok or not decoded then
          emit(term, "error", "nv: push failed: invalid server response: %s", body)
          return
        end
        if decoded.error then
          emit(term, "error", "nv: push rejected: %s", decoded.error)
          return
        end
        if decoded.upToDate then
          emit(term, "info", "nv: remote is already up to date%s", skipped_binary > 0 and ("; skipped " .. skipped_binary .. " binary files") or "")
        else
          emit(term, "info", "nv: push complete to branch '%s'. commit=%s changed=%s deleted=%s%s",
            decoded.branch or branch,
            tostring(decoded.commitId or "?"),
            tostring(decoded.changed or 0),
            tostring(decoded.deleted or 0),
            skipped_binary > 0 and (" skipped_binary=" .. skipped_binary) or ""
          )
        end
      end)
    end
  elseif cmd == "pull" then
    local nv_dir = get_nv_dir()
    if not nv_dir then
      emit(term, "error", "nv: Not a NexusVault repository")
      return
    end
    local cfg = read_config(nv_dir)
    local remote_name = args[2] or "origin"
    local branch = args[3] or read_file(nv_dir .. "/HEAD") or "main"
    branch = (branch:gsub("%s+", ""))
    
    local remote_url = cfg["remote." .. remote_name .. ".url"] or cfg["remote.origin.url"]
    local token = cfg["auth.token"]
    if not remote_url then
      emit(term, "error", "nv: fatal: No remote repository connected.")
    elseif not token then
      emit(term, "error", "nv: fatal: No auth token. Use 'nv login <token>'")
    else
      local base, owner, repo = parse_remote_url(remote_url)
      if not base then
        emit(term, "error", "nv: invalid remote URL")
        return
      end
      emit(term, "info", "nv: pulling %s/%s from %s (%s)", owner, repo, remote_name, branch)
      core.add_thread(function()
        local endpoint = base .. "/api/repos/" .. owner .. "/" .. repo .. "/files?branch=" .. branch .. "&limit=2000"
        local body, err = run_get(endpoint, token)
        if not body then
          emit(term, "error", "nv: pull failed: %s", err or "network error")
          return
        end
        local ok, files_data = pcall(json.decode, body)
        if not ok or type(files_data) ~= "table" then
          emit(term, "error", "nv: pull failed: invalid response")
          return
        end
        
        local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
        local count = 0
        local head_state = read_head_state(nv_dir)
        
        for i, file in ipairs(files_data) do
          local path = root .. (PATHSEP or "/") .. file.path
          -- Create parent directories if needed
          local p = ""
          local parts = {}
          for part in file.path:gmatch("[^/]+") do table.insert(parts, part) end
          table.remove(parts) -- remove filename
          p = root
          for _, part in ipairs(parts) do
            p = p .. (PATHSEP or "/") .. part
            if not system.get_file_info(p) then system.mkdir(p) end
          end
          
          if write_file(path, file.content) then
            local stat = system.get_file_info(path)
            if stat then head_state[path] = stat.modified end
            count = count + 1
          end
          if i % 20 == 0 then coroutine.yield() end
        end
        
        write_head_state(nv_dir, head_state)
        emit(term, "info", "nv: pull complete. updated %d files.", count)
        if core.active_view then core.redraw = true end
      end)
    end
  elseif cmd == "checkout" or cmd == "restore" then
    local cid = args[2]
    if not cid then
      emit(term, "error", "nv: checkout requires a commit ID. Run 'nv log' to see IDs.")
      return
    end
    local nv_dir = get_nv_dir()
    local commit_dir = nv_dir .. "/commits/" .. cid
    if not system.get_file_info(commit_dir) then
      emit(term, "error", "nv: commit '%s' not found.", cid)
      return
    end
    emit(term, "dim", "nv: restoring commit %s...", cid)
    core.add_thread(function()
      local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
      local ignore_patterns = parse_nvignore(root)
      local backup_files = get_all_files(commit_dir .. "/files", commit_dir .. "/files", {}, {count=0}, ignore_patterns)
      local backup_lookup = {}
      for _, f in ipairs(backup_files) do
        local rel_path = f:sub(#(commit_dir .. "/files") + 2)
        backup_lookup[rel_path] = true
      end

      local workspace_files = get_all_files(root, root, {}, {count=0}, ignore_patterns)
      local remove_count = 0
      for i, f in ipairs(workspace_files) do
        local rel_path = f
        if f:find(root, 1, true) == 1 then
          rel_path = f:sub(#root + 2)
        end
        if not backup_lookup[rel_path] then
          os.remove(f)
          remove_count = remove_count + 1
        end
        if i % 10 == 0 then coroutine.yield() end
      end

      local restore_count = 0
      local new_head_state = {}

      for _, f in ipairs(backup_files) do
        local rel_path = f:sub(#(commit_dir .. "/files") + 2)
        local dest = root .. (PATHSEP or "/") .. rel_path
        copy_file(f, dest)

        local stat = system.get_file_info(dest)
        if stat then new_head_state[dest] = stat.modified end

        restore_count = restore_count + 1
        if restore_count % 10 == 0 then coroutine.yield() end
      end

      write_head_state(nv_dir, new_head_state)
      write_file(nv_dir .. "/index", "")

      emit(term, "info", "nv: checkout complete. Restored %d files, removed %d files. (commit %s)", restore_count, remove_count, cid)
      if core.active_view then core.redraw = true end
    end)
  else
    local suggestion = suggest_command(cmd)
    if suggestion then
      emit(term, "error", "nv: unknown command '%s'. Did you mean 'nv %s'? Use 'nv help' to list commands.", cmd or "", suggestion)
    else
      emit(term, "error", "nv: unknown command '%s'. Use 'nv help' to list commands or 'nv doctor' to diagnose the project.", cmd or "")
    end
  end
end

function NVTerminalView:new()
  NVTerminalView.super.new(self)
  self.scrollable = true
  self.input = ""
  self.lines = {}
  self.history = {}
  self.history_index = 1
  self.selection = { start = nil, ["end"] = nil }
  self.selecting = false
  self:append("NexusVault Terminal. Type 'nv help' for commands. Use Esc or the tab close button to close.", style.dim)
end

function NVTerminalView:get_name()
  return "NV Terminal"
end

function NVTerminalView:get_font()
  return style.code_font or style.font
end

function NVTerminalView:supports_text_input()
  return true
end

function NVTerminalView:get_line_height()
  return math.floor(self:get_font():get_height() * 1.35)
end

function NVTerminalView:get_wrap_width()
  return math.max(1, self.size.x - style.padding.x * 2 - style.caret_width)
end

local function wrap_terminal_line(font, text, max_width)
  if text == "" then return { "" } end
  if max_width <= 1 or font:get_width(text) <= max_width then return { text } end

  local wrapped = {}
  local remaining = text
  while remaining ~= "" do
    if font:get_width(remaining) <= max_width then
      table.insert(wrapped, remaining)
      break
    end

    local cut = 1
    local last_space
    for i = 1, #remaining do
      local ch = remaining:sub(i, i)
      if ch:match("%s") then last_space = i end
      if font:get_width(remaining:sub(1, i)) > max_width then
        cut = last_space and last_space > 1 and last_space - 1 or math.max(1, i - 1)
        break
      end
      cut = i
    end

    table.insert(wrapped, remaining:sub(1, cut))
    local next_pos = cut + 1
    while next_pos <= #remaining and remaining:sub(next_pos, next_pos):match("%s") do
      next_pos = next_pos + 1
    end
    remaining = remaining:sub(next_pos)
  end

  return wrapped
end

function NVTerminalView:each_visual_line(include_prompt)
  local font = self:get_font()
  local wrap_width = self:get_wrap_width()
  return coroutine.wrap(function()
    for _, item in ipairs(self.lines) do
      for _, text in ipairs(wrap_terminal_line(font, item.text, wrap_width)) do
        coroutine.yield(text, item.color or style.text)
      end
    end
    if include_prompt then
      local prompt_lines = wrap_terminal_line(font, "> " .. self.input, wrap_width)
      for i, text in ipairs(prompt_lines) do
        coroutine.yield(text, style.text, i == #prompt_lines)
      end
    end
  end)
end

function NVTerminalView:get_scrollable_size()
  local count = 0
  for _ in self:each_visual_line(true) do
    count = count + 1
  end
  return count * self:get_line_height() + style.padding.y * 2
end

function NVTerminalView:scroll_to_bottom()
  self.scroll.to.y = math.max(0, self:get_scrollable_size() - self.size.y)
end

function NVTerminalView:append(text, color)
  color = color or style.text
  text = tostring(text)
  local pos = 1
  while true do
    local next_newline = text:find("\n", pos, true)
    if next_newline then
      table.insert(self.lines, { text = text:sub(pos, next_newline - 1), color = color })
      pos = next_newline + 1
    else
      table.insert(self.lines, { text = text:sub(pos), color = color })
      break
    end
  end
  while #self.lines > 1000 do table.remove(self.lines, 1) end
  self:scroll_to_bottom()
  self.selection = { start = nil, ["end"] = nil }
  core.redraw = true
end

function NVTerminalView:get_full_text()
  local out = {}
  for _, item in ipairs(self.lines) do
    table.insert(out, item.text)
  end
  table.insert(out, "> " .. self.input)
  return table.concat(out, "\n")
end

function NVTerminalView:get_pos_at(px, py)
  local font = self:get_font()
  local lh = self:get_line_height()
  local ox, oy = self:get_content_offset()
  
  local target_y = py - oy - style.padding.y
  local line_idx = math.floor(target_y / lh) + 1
  
  local current_line = 1
  local char_offset = 0
  for text, color, is_prompt in self:each_visual_line(true) do
    if current_line == line_idx then
      local target_x = px - ox - style.padding.x
      local relative_char = 1
      for i = 1, #text do
        if font:get_width(text:sub(1, i)) > target_x then
          relative_char = i
          break
        end
        relative_char = i + 1
      end
      return char_offset + relative_char
    end
    char_offset = char_offset + #text + 1
    current_line = current_line + 1
  end
  return char_offset + 1
end

function NVTerminalView:clear()
  self.lines = {}
  self.scroll.to.y = 0
  self.scroll.y = 0
  core.redraw = true
end

function NVTerminalView:close()
  local node = core.root_view.root_node:get_node_for_view(self)
  if node then
    node:close_view(core.root_view.root_node, self)
    core.root_view.root_node:update_layout()
  end
  if terminal_view == self then terminal_view = nil end
end

function NVTerminalView:submit()
  local text = self.input:match("^%s*(.-)%s*$")
  self:append("> " .. text, terminal_color("command"))
  self.input = ""
  if text == "" then return end
  table.insert(self.history, text)
  self.history_index = #self.history + 1
  execute_nv_command(self, text)
end

function NVTerminalView:backspace()
  self.input = self.input:sub(1, -2)
  self:scroll_to_bottom()
  core.redraw = true
end

function NVTerminalView:history_move(delta)
  if #self.history == 0 then return end
  self.history_index = common.clamp(self.history_index + delta, 1, #self.history + 1)
  self.input = self.history[self.history_index] or ""
  self:scroll_to_bottom()
  core.redraw = true
end

function NVTerminalView:on_mouse_pressed(button, x, y, clicks)
  local caught = NVTerminalView.super.on_mouse_pressed(self, button, x, y, clicks)
  if caught then return caught end
  if button == "left" then
    self.selection.start = self:get_pos_at(x, y)
    self.selection["end"] = self.selection.start
    self.selecting = true
  end
  core.set_active_view(self)
  return true
end

function NVTerminalView:on_mouse_moved(x, y, dx, dy)
  NVTerminalView.super.on_mouse_moved(self, x, y, dx, dy)
  if self.selecting then
    self.selection["end"] = self:get_pos_at(x, y)
    core.redraw = true
  end
end

function NVTerminalView:on_mouse_released(button, x, y)
  NVTerminalView.super.on_mouse_released(self, button, x, y)
  if button == "left" then
    self.selecting = false
    if self.selection.start == self.selection["end"] then
      self.selection.start = nil
      self.selection["end"] = nil
    end
    core.redraw = true
  end
end

function NVTerminalView:on_text_input(text)
  self.input = self.input .. text:gsub("[\r\n]", "")
  self:scroll_to_bottom()
  core.redraw = true
end

function NVTerminalView:draw()
  self:draw_background(style.background)

  local font = self:get_font()
  local lh = self:get_line_height()
  local x, y = self:get_content_offset()
  x = x + style.padding.x
  y = y + style.padding.y
  local w = self.size.x - style.padding.x * 2
  
  local s_start, s_end = self.selection.start, self.selection["end"]
  if s_start and s_end and s_start > s_end then s_start, s_end = s_end, s_start end

  core.push_clip_rect(self.position.x, self.position.y, self.size.x, self.size.y)
  local char_offset = 0
  for text, color, is_prompt in self:each_visual_line(true) do
    if y + lh >= self.position.y and y <= self.position.y + self.size.y then
      -- Draw selection highlight
      if s_start and s_end and char_offset + #text >= s_start and char_offset < s_end then
        local line_s = math.max(0, s_start - char_offset)
        local line_e = math.min(#text, s_end - char_offset)
        local h_x = x + font:get_width(text:sub(1, line_s))
        local h_w = font:get_width(text:sub(line_s + 1, line_e))
        renderer.draw_rect(h_x, y, h_w, lh, style.selection)
      end

      common.draw_text(font, color, text, "left", x, y, w, lh)
      if is_prompt and core.active_view == self and system.window_has_focus(core.window) then
        local caret_x = x + font:get_width(text)
        renderer.draw_rect(caret_x, y + math.floor(lh * 0.15), style.caret_width, math.floor(lh * 0.75), style.caret)
      end
    end
    char_offset = char_offset + #text + 1
    y = y + lh
  end
  core.pop_clip_rect()
  NVTerminalView.super.draw_scrollbar(self)
end

function NVTerminalView:try_close(do_close)
  do_close()
  if terminal_view == self then terminal_view = nil end
end

local function find_unlocked_leaf(node)
  if not node then return nil end
  if node.type == "leaf" then
    return node.locked and nil or node
  end
  return find_unlocked_leaf(node.a) or find_unlocked_leaf(node.b)
end

local function get_terminal_target_node()
  local root = core.root_view.root_node
  local node

  if core.last_active_view then
    node = root:get_node_for_view(core.last_active_view)
    if node and not node.locked then return node end
  end

  if core.active_view then
    node = root:get_node_for_view(core.active_view)
    if node and not node.locked then return node end
  end

  node = core.root_view:get_primary_node()
  if node and not node.locked then return node end

  return find_unlocked_leaf(root)
end

local function open_nv_terminal()
  local node = terminal_view and core.root_view.root_node:get_node_for_view(terminal_view)
  if node then
    node:set_active_view(terminal_view)
    return
  end

  terminal_view = NVTerminalView()
  node = get_terminal_target_node()
  if not node then
    terminal_view = nil
    core.error("nv: could not open terminal because no unlocked editor pane is available")
    return
  end
  node:add_view(terminal_view)
  core.root_view.root_node:update_layout()
end

command.add(NVTerminalView, {
  ["nv-terminal:submit"] = function(view) view:submit() end,
  ["nv-terminal:backspace"] = function(view) view:backspace() end,
  ["nv-terminal:close"] = function(view) view:close() end,
  ["nv-terminal:history-previous"] = function(view) view:history_move(-1) end,
  ["nv-terminal:history-next"] = function(view) view:history_move(1) end,
  ["nv-terminal:clear"] = function(view) view:clear() end,
  ["nv-terminal:paste"] = function(view)
    view:on_text_input(system.get_clipboard())
  end,
  ["nv-terminal:copy-all"] = function(view)
    system.set_clipboard(view:get_full_text())
    core.log("Terminal output copied to clipboard")
  end,
  ["nv-terminal:copy"] = function(view)
    local s_start, s_end = view.selection.start, view.selection["end"]
    if not s_start or not s_end then return end
    if s_start > s_end then s_start, s_end = s_end, s_start end
    local text = view:get_full_text()
    system.set_clipboard(text:sub(s_start, s_end))
    core.log("Selection copied to clipboard")
  end,
})

keymap.add {
  ["return"] = "nv-terminal:submit",
  ["keypad enter"] = "nv-terminal:submit",
  ["backspace"] = "nv-terminal:backspace",
  ["shift+backspace"] = "nv-terminal:backspace",
  ["escape"] = "nv-terminal:close",
  ["up"] = "nv-terminal:history-previous",
  ["down"] = "nv-terminal:history-next",
  ["ctrl+l"] = "nv-terminal:clear",
  ["ctrl+v"] = "nv-terminal:paste",
  ["ctrl+c"] = "nv-terminal:copy",
  ["ctrl+shift+c"] = "nv-terminal:copy-all",
}

command.add(nil, {
  ["nv:init"] = function()
    local nv_dir = get_nv_dir()
    if not nv_dir then
      core.error("No active project directory found")
      return
    end
    
    local stat = system.get_file_info(nv_dir)
    if stat and stat.type == "dir" then
      show_nv_status_popup()
      return
    end
    
    system.mkdir(nv_dir)
    system.mkdir(nv_dir .. "/objects")
    system.mkdir(nv_dir .. "/commits")
    write_file(nv_dir .. "/HEAD", "main")
    write_file(nv_dir .. "/index", "")
    write_file(nv_dir .. "/HEAD_state", "")

    -- Hide the directory on Windows
    if PATHSEP == "\\" then
      if process and process.start then
        process.start({"attrib", "+h", nv_dir})
      else
        os.execute('attrib +h "' .. nv_dir .. '"')
      end
    end
    
    core.log("Initialized empty NexusVault repository in %s", nv_dir)
    if core.active_view then core.redraw = true end
  end,
  
  ["nv:status"] = function()
    show_nv_status_popup()
  end,

  ["nv:add"] = function()
    local nv_dir = get_nv_dir()
    if not nv_dir or not system.get_file_info(nv_dir) then
      core.error("Not a NexusVault repository")
      return
    end
    
    local doc = core.active_view and core.active_view.doc
    if not doc or not doc.filename then
      core.error("No active file to add")
      return
    end
    
    if doc:is_dirty() then doc:save() end
    
    local index = read_file(nv_dir .. "/index") or ""
    if not index:find(doc.filename, 1, true) then
      write_file(nv_dir .. "/index", index .. doc.filename .. "\n")
      core.log("nv: added '%s' to staging", doc.filename)
    else
      core.log("nv: '%s' is already staged", doc.filename)
    end
  end,
  
  ["nv:commit"] = function()
    local nv_dir = get_nv_dir()
    if not nv_dir or not system.get_file_info(nv_dir) then
      core.error("Not a NexusVault repository")
      return
    end
    
    local index = read_file(nv_dir .. "/index") or ""
    if index == "" or not index:find("%S") then
      core.error("Nothing to commit (staging area empty)")
      return
    end
    
    core.command_view:enter("Commit message", {
      submit = function(msg)
        core.add_thread(function()
          if not msg or msg == "" then 
            core.error("Aborting commit due to empty message")
            return 
          end
          
          local commit_id = tostring(os.time())
          local commit_dir = nv_dir .. "/commits/" .. commit_id
          system.mkdir(commit_dir)
          system.mkdir(commit_dir .. "/files")

          -- Copy files into the commit backup dir and record states
          local root = core.project_dir or (core.projects and core.projects[1] and core.projects[1].path)
          local copy_count = 0
          local new_head_state = {}
          
          -- Snapshot all files to keep checkout functional
          local ignore_patterns = parse_nvignore(root)
          local all_files = get_all_files(root, root, {}, {count=0}, ignore_patterns)
          for _, f in ipairs(all_files) do
             local rel_path = f
             if f:find(root, 1, true) == 1 then
               rel_path = f:sub(#root + 2)
             end
             local dest = commit_dir .. "/files/" .. rel_path
             copy_file(f, dest)
             
             local stat = system.get_file_info(f)
             if stat then new_head_state[f] = stat.modified end
             
             copy_count = copy_count + 1
             if copy_count % 10 == 0 then coroutine.yield() end
          end

          local commit_data = "Date: " .. os.date() .. "\nMessage: " .. msg .. "\nFiles:\n" .. index
          write_file(commit_dir .. "/metadata", commit_data)
          write_head_state(nv_dir, new_head_state)
          
          -- Clear index
          write_file(nv_dir .. "/index", "")
          core.log("nv: Created commit %s - %s", commit_id, msg)
        end)
      end
    })
  end,
  
  ["nv:log"] = function()
    local nv_dir = get_nv_dir()
    if not nv_dir or not system.get_file_info(nv_dir) then
      core.error("Not a NexusVault repository")
      return
    end
    
    local commits = system.list_dir(nv_dir .. "/commits") or {}
    if #commits == 0 then
      core.log("NexusVault Log: No commits yet.")
      return
    end
    
    -- Sort commits chronologically (since they are timestamps)
    table.sort(commits)
    
    local log_str = "NexusVault Commits:\n\n"
    for i = #commits, 1, -1 do
      local cid = commits[i]
      local meta = read_file(nv_dir .. "/commits/" .. cid .. "/metadata")
      if not meta then meta = read_file(nv_dir .. "/commits/" .. cid) end
      if meta then
        local msg = meta:match("Message:%s*(.-)\n") or "No message"
        local date = meta:match("Date:%s*(.-)\n") or "Unknown date"
        log_str = log_str .. "Commit ID: " .. cid .. "\nDate: " .. date .. "\nMsg: " .. msg .. "\n\n"
      end
    end
    
    local opt = { 
      { text = "Copy Latest ID", default_yes = true },
      { text = "Close", default_no = true } 
    }
    core.nag_view:show("NexusVault Log", log_str, opt, function(item) 
      if item.text == "Copy Latest ID" then
        if system.set_clipboard then
          system.set_clipboard(commits[#commits])
          core.log("Copied latest commit ID (%s) to clipboard.", commits[#commits])
        else
          core.error("Clipboard access not supported in this version.")
        end
      end
    end)
  end,

  ["nv:terminal"] = function()
    open_nv_terminal()
  end,

  ["nv:settings"] = function()
    local node = settings_view and core.root_view.root_node:get_node_for_view(settings_view)
    if node then
      node:set_active_view(settings_view)
      return
    end
    settings_view = NVSettingsView()
    node = get_terminal_target_node()
    if not node then
      settings_view = nil
      core.error("nv: could not open settings because no unlocked editor pane is available")
      return
    end
    node:add_view(settings_view)
    core.root_view.root_node:update_layout()
  end
})


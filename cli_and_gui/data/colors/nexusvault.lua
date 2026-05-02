local style = require "core.style"
local common = require "core.common"

-- NexusVault Neobrutalist Theme
style.background = { common.color "#080808" }  -- Main editor background (Docview)
style.background2 = { common.color "#0d0d0d" } -- Sidebar (Treeview)
style.background3 = { common.color "#0a0a0a" } -- Command view / Footer
style.text = { common.color "#ffffff" }        -- Primary text
style.caret = { common.color "#dc2626" }       -- Cursor (Vibrant Red)
style.accent = { common.color "#dc2626" }      -- Accent color (Red)
style.dim = { common.color "#525252" }         -- Inactive tabs / Dimmed text
style.divider = { common.color "#dc2626" }     -- Divider between panes (Nexus Red)
style.selection = { common.color "rgba(220, 38, 38, 0.3)" } -- Selection (Transparent Red)
style.line_number = { common.color "#333333" }
style.line_number2 = { common.color "#dc2626" } -- Active line number (Red)
style.line_highlight = { common.color "#121212" } -- Current line highlight
style.scrollbar = { common.color "#dc2626" }   -- Scrollbar (Red)
style.scrollbar2 = { common.color "#ff0000" }  -- Scrollbar Hover
style.scrollbar_track = { common.color "#000000" }
style.nagbar = { common.color "#dc2626" }      -- Alert bars
style.nagbar_text = { common.color "#ffffff" }
style.nagbar_dim = { common.color "rgba(0, 0, 0, 0.6)" }
style.drag_overlay = { common.color "rgba(255,255,255,0.1)" }
style.drag_overlay_tab = { common.color "#dc2626" }
style.good = { common.color "#72b886" }
style.warn = { common.color "#FFA94D" }
style.error = { common.color "#FF3333" }
style.modified = { common.color "#dc2626" }

style.syntax["normal"] = { common.color "#ffffff" }
style.syntax["symbol"] = { common.color "#ffffff" }
style.syntax["comment"] = { common.color "#525252" }   -- Dark gray comments
style.syntax["keyword"] = { common.color "#dc2626" }   -- Keywords in Nexus Red
style.syntax["keyword2"] = { common.color "#ff4444" }  -- Secondary keywords
style.syntax["number"] = { common.color "#ffffff" }    -- White numbers
style.syntax["literal"] = { common.color "#ff0000" }   -- True/False/Nil in Red
style.syntax["string"] = { common.color "#cccccc" }    -- Light gray strings
style.syntax["operator"] = { common.color "#dc2626" }  -- Operators in Red
style.syntax["function"] = { common.color "#ffffff" }  -- Functions in White

style.log["INFO"]  = { icon = "i", color = style.text }
style.log["WARN"]  = { icon = "!", color = style.warn }
style.log["ERROR"] = { icon = "!", color = style.error }

return style

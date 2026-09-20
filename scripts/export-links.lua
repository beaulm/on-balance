-- scripts/export-links.lua
-- Pandoc filter to rewrite relative and root-relative links to canonical absolute URLs for standalone EPUB and PDF exports.

local SITE_URL = "https://onbalanceproject.com"

function Pandoc(doc)
  local module_slug = doc.meta.module_slug and pandoc.utils.stringify(doc.meta.module_slug) or nil
  return doc:walk {
    Link = function(el)
      local target = el.target
      -- Skip external URLs, in-page anchors, and mailto links
      if target:match("^%a+://") or target:match("^#") or target:match("^mailto:") then
        return el
      end

      -- Root-relative link: e.g. /modules/attention-as-lever
      if target:sub(1, 1) == "/" then
        el.target = SITE_URL .. target
        return el
      end

      -- Relative link: e.g. worksheet.md or ./worksheet.md
      if module_slug then
        local clean_target = target:gsub("^%./", "")
        el.target = SITE_URL .. "/modules/" .. module_slug .. "/" .. clean_target
        return el
      end

      return el
    end
  }
end

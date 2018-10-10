module Jekyll
    module SidebarItemFilter
        def sidebar_item(item)
            pageID = @context.registers[:page]["id"]
            baseurl = @context.registers[:page]["relative_root"]
            itemID = item["id"]
            href = item["href"] || "#{baseurl}/docs/#{itemID}"
            isActive = pageID == itemID
            isActiveClassName = isActive ? "active" : ""
            categoryLink = "<a href=\"#{href}\" class=\"#{isActiveClassName} docs-nav-item\">#{item["title"]}</a>"

            if item["subitems"] && isActive
                subItems = ""
                for subItem in item["subitems"]
                   subItems += "<li><a href=\"##{subItem["id"]}\" class=\"docs-nav-subitem\">#{subItem["title"]}</a></li>"
                end
                "<li class=\"#{isActiveClassName}\">#{categoryLink}<ul>#{subItems}</ul></li>"
            else
                "<li class=\"#{isActiveClassName}\">#{categoryLink}</li>"
            end
        end
    end
end

Liquid::Template.register_filter(Jekyll::SidebarItemFilter)
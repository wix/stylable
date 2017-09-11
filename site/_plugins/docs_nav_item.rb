module Jekyll
    module SidebarItemFilter
        def sidebar_item(item)
            baseurl = Jekyll.configuration({})['baseurl']
            pageID = @context.registers[:page]["id"]
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
                return "<li class=\"#{isActiveClassName}\">#{categoryLink}<ul>#{subItems}</ul></li>"
            else
                return "<li class=\"#{isActiveClassName}\">#{categoryLink}</li>"
            end
        end
    end
end

Liquid::Template.register_filter(Jekyll::SidebarItemFilter)
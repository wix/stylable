module ChangeLocalMdLinksToHtml
    class Generator < Jekyll::Generator
        def generate(site)
            site.pages.each { |page| convertLink(page) }
        end
        def convertLink(page)
            page.content = page.content.gsub(/(\[[^\]]*\]\([^:\)]*)\.md(#[^\)]*)?\)/, '\1\2)')
        end
    end
end
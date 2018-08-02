Jekyll::Hooks.register :pages, :pre_render do |page, payload|
  depth = page.url.split('/').size - 1
  if depth <= 1
    payload['page']['relative_root'] = '.'
  else
    base = '..'
    while depth >= 3
      base = base + '/..'
      depth -= 1
    end
    payload['page']['relative_root'] = base
  end
end

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Field } from '../components/ui'
it('starts masked, preserves password-manager metadata and never submits from the visibility control',()=>{
 const html=renderToStaticMarkup(createElement(Field,{label:'Password',name:'password',type:'password',autoComplete:'current-password',required:true,minLength:8}))
 expect(html).toContain('type="password"')
 expect(html).toContain('autoComplete="current-password"')
 expect(html).toContain('name="password"')
 expect(html).toContain('type="button"')
 expect(html).toContain('aria-label="Show password"')
 expect(html).toContain('aria-pressed="false"')
 expect(renderToStaticMarkup(createElement(Field,{label:'Email',type:'email'}))).not.toContain('password-visibility')
})

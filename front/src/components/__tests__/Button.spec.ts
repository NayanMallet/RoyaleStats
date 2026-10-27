import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Button } from '@/components/ui/button'

describe('Button (design system)', () => {
  it('renders its slot content', () => {
    const wrapper = mount(Button, { slots: { default: 'Rechercher' } })

    expect(wrapper.text()).toBe('Rechercher')
  })

  it('emits click events', async () => {
    const wrapper = mount(Button, { slots: { default: 'Valider' } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('applies the destructive variant classes', () => {
    const wrapper = mount(Button, { props: { variant: 'destructive' } })

    expect(wrapper.classes()).toContain('bg-destructive')
  })
})

import type { Meta, StoryObj } from '@storybook/react'
import { BetControls } from './BetControls'

const meta: Meta<typeof BetControls> = {
  title: 'Game/BetControls',
  component: BetControls,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof BetControls>

export const Default: Story = {}

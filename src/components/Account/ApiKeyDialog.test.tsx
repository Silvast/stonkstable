import { describe, it, expect, beforeEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '../../test/utils/testHelpers'
import ApiKeyDialog from './ApiKeyDialog'
import { useStockSelection } from '../../context/StockSelectionContext'
import { saveDeviceApiKey } from '../../utils/apiKeyStorage'

const KeyProbe = () => {
    const { apiKey } = useStockSelection()
    return <output data-testid="key" data-key={apiKey} />
}

const renderDialog = (onClose = vi.fn()) => {
    render(<><ApiKeyDialog open onClose={onClose} /><KeyProbe /></>)
    return onClose
}

describe('ApiKeyDialog', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('edits the key in a masked password field', async () => {
        const user = userEvent.setup()
        renderDialog()

        expect(screen.getByRole('dialog', { name: 'EODHD API key' })).toBeInTheDocument()
        const field = screen.getByLabelText('API key')
        expect(field).toHaveAttribute('type', 'password')

        await user.type(field, 'secret-key')

        expect(screen.getByTestId('key')).toHaveAttribute('data-key', 'secret-key')
        expect(document.body.textContent).not.toContain('secret-key')
    })

    it('remembers the key on this device only when the box is ticked', async () => {
        const user = userEvent.setup()
        renderDialog()
        const remember = screen.getByRole('checkbox', { name: 'Remember on this device' })
        expect(remember).not.toBeChecked()

        await user.type(screen.getByLabelText('API key'), 'secret-key')
        expect(localStorage.getItem('stonkstable:apikey:v1')).toBeNull()

        await user.click(remember)

        expect(localStorage.getItem('stonkstable:apikey:v1')).toBe('secret-key')
    })

    it('starts ticked when a key is already remembered', () => {
        saveDeviceApiKey('device-key')
        renderDialog()

        expect(screen.getByRole('checkbox', { name: 'Remember on this device' })).toBeChecked()
    })

    it('closes with Done', async () => {
        const user = userEvent.setup()
        const onClose = renderDialog()

        await user.click(screen.getByRole('button', { name: 'Done' }))

        expect(onClose).toHaveBeenCalled()
    })
})

import { Request, Response } from 'express'
import { getDatabase } from '../database'
import { logger } from 'shared'
import type { Item } from 'shared'

export async function listItems(req: Request, res: Response) {
    try {
        const db = getDatabase()
        const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all() as Item[]
        res.json(items)
    } catch (error) {
        logger.error('Error listing items:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to list items' })
    }
}

export async function createItem(req: Request, res: Response) {
    try {
        const { name, description } = req.body

        if (!name) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Name is required',
            })
        }

        const db = getDatabase()
        const result = db.prepare('INSERT INTO items (name, description) VALUES (?, ?)').run(
            name,
            description || null,
        )

        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid) as Item

        logger.info(`Item created: ${name} (ID: ${result.lastInsertRowid})`)
        res.status(201).json(item)
    } catch (error) {
        logger.error('Error creating item:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to create item' })
    }
}

export async function getItem(req: Request, res: Response) {
    try {
        const { id } = req.params
        const db = getDatabase()
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined

        if (!item) {
            return res.status(404).json({
                error: 'NotFoundError',
                message: 'Item not found',
            })
        }

        res.json(item)
    } catch (error) {
        logger.error('Error getting item:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to get item' })
    }
}

export async function updateItem(req: Request, res: Response) {
    try {
        const { id } = req.params
        const { name, description } = req.body

        if (!name && !description) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'At least one field (name or description) is required',
            })
        }

        const db = getDatabase()

        // Build update query dynamically
        const updates: string[] = []
        const params: any[] = []

        if (name) {
            updates.push('name = ?')
            params.push(name)
        }
        if (description !== undefined) {
            updates.push('description = ?')
            params.push(description)
        }

        params.push(id)

        const result = db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...params)

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'NotFoundError',
                message: 'Item not found',
            })
        }

        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item

        logger.info(`Item updated: ${id}`)
        res.json(item)
    } catch (error) {
        logger.error('Error updating item:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to update item' })
    }
}

export async function deleteItem(req: Request, res: Response) {
    try {
        const { id } = req.params
        const db = getDatabase()

        const result = db.prepare('DELETE FROM items WHERE id = ?').run(id)

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'NotFoundError',
                message: 'Item not found',
            })
        }

        logger.info(`Item deleted: ${id}`)
        res.status(204).send()
    } catch (error) {
        logger.error('Error deleting item:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to delete item' })
    }
}

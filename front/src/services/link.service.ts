import { http } from './http'
import { apiEndpoints } from '@/config/api'
import { authService } from './auth.service'

export interface PlayerLink {
    id: number
    user_id: number
    player_tag: string
    twitter?: string
    twitch?: string
    linked_at: string
}

export interface LinkCreatePayload {
    userId: number
    playerTag: string
}

export const linkService = {
    async createLink(playerTag: string): Promise<PlayerLink> {
        const user = authService.getUser()
        if (!user) {
            throw new Error('User not authenticated')
        }

        const payload: LinkCreatePayload = {
            userId: user.id,
            playerTag,
        }

        return http.post<PlayerLink>(apiEndpoints.link.create, payload)
    },

    async getLink(): Promise<PlayerLink | null> {
        const user = authService.getUser()
        if (!user) {
            return null
        }

        try {
            return await http.get<PlayerLink>(apiEndpoints.link.get(user.id))
        } catch (error: any) {
            // If 404, user has no link
            if (error.status === 404) {
                return null
            }
            throw error
        }
    },

    async getLinkByTag(tag: string): Promise<PlayerLink | null> {
        try {
            return await http.get<PlayerLink>(apiEndpoints.link.getByTag(tag))
        } catch (error: any) {
            if (error.status === 404) {
                return null
            }
            throw error
        }
    },

    async updateLink(twitter?: string, twitch?: string): Promise<PlayerLink> {
        const user = authService.getUser()
        if (!user) {
            throw new Error('User not authenticated')
        }

        return http.patch<PlayerLink>(apiEndpoints.link.update(user.id), { twitter, twitch })
    },

    async deleteLink(): Promise<void> {
        const user = authService.getUser()
        if (!user) {
            throw new Error('User not authenticated')
        }

        return http.delete<void>(apiEndpoints.link.delete(user.id))
    },
}

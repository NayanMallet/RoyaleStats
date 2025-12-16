<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Form as VeeForm, Field as VeeField } from 'vee-validate'
import type { SubmissionHandler } from 'vee-validate'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const props = defineProps<{ submitting?: boolean }>()
const emit = defineEmits<{
    (e: 'submit', payload: { player_tag: string; password: string }): void
}>()

const userFormSchema = toTypedSchema(
    z.object({
        player_tag: z
            .string()
            .min(3, 'Player tag must be at least 3 characters.')
            .regex(/^#?[0-9A-Z]+$/i, 'Player tag must contain only letters and numbers (e.g., #ABC123).'),
        password: z.string().min(6, 'Password must be at least 6 characters.'),
    }),
)

const onSubmit: SubmissionHandler = (values) => {
    const { player_tag, password } = values as {
        player_tag: string
        password: string
    }

    emit('submit', { player_tag, password })
}
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>Create user</CardTitle>
            <CardDescription>
                Register with your Clash Royale player tag.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <VeeForm
                v-slot="{ handleSubmit, resetForm }"
                :validation-schema="userFormSchema"
                :initial-values="{ player_tag: '', password: '' }"
                as="div"
            >
                <form
                    class="space-y-4"
                    @submit.prevent="handleSubmit($event, onSubmit)"
                    :aria-busy="props.submitting"
                >
                    <FieldGroup>
                        <VeeField v-slot="{ field, errors }" name="player_tag">
                            <Field :data-invalid="!!errors.length">
                                <FieldLabel for="player-tag">Player Tag</FieldLabel>
                                <Input
                                    id="player-tag"
                                    v-bind="field"
                                    placeholder="#ABC123XYZ"
                                    :aria-invalid="!!errors.length"
                                />
                                <FieldError v-if="errors.length" :errors="errors" />
                            </Field>
                        </VeeField>

                        <VeeField v-slot="{ field, errors }" name="password">
                            <Field :data-invalid="!!errors.length">
                                <FieldLabel for="user-password">Password</FieldLabel>
                                <Input
                                    id="user-password"
                                    v-bind="field"
                                    type="password"
                                    placeholder="••••••••"
                                    :aria-invalid="!!errors.length"
                                />
                                <FieldError v-if="errors.length" :errors="errors" />
                            </Field>
                        </VeeField>
                    </FieldGroup>

                    <div class="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            @click="resetForm()"
                            :disabled="props.submitting"
                        >
                            Reset
                        </Button>
                        <Button type="submit" :disabled="props.submitting">
                            <span v-if="props.submitting">Creating…</span>
                            <span v-else>Create user</span>
                        </Button>
                    </div>
                </form>
            </VeeForm>
        </CardContent>
    </Card>
</template>

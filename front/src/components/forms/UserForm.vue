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
  (e: 'submit', payload: { name: string; email: string; password: string }): void
}>()

const userFormSchema = toTypedSchema(
  z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.email('Please provide a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
  }),
)

const onSubmit: SubmissionHandler = (values) => {
  const { name, email, password } = values as {
    name: string
    email: string
    password: string
  }

  emit('submit', { name, email, password })
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Create user</CardTitle>
      <CardDescription> Send a POST request to the user microservice. </CardDescription>
    </CardHeader>
    <CardContent>
      <VeeForm
        v-slot="{ handleSubmit, resetForm }"
        :validation-schema="userFormSchema"
        :initial-values="{ name: '', email: '', password: '' }"
        as="div"
      >
        <form
          class="space-y-4"
          @submit.prevent="handleSubmit($event, onSubmit)"
          :aria-busy="props.submitting"
        >
          <FieldGroup>
            <VeeField v-slot="{ field, errors }" name="name">
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="user-name">Name</FieldLabel>
                <Input
                  id="user-name"
                  v-bind="field"
                  placeholder="Jane Doe"
                  :aria-invalid="!!errors.length"
                />
                <FieldError v-if="errors.length" :errors="errors" />
              </Field>
            </VeeField>

            <VeeField v-slot="{ field, errors }" name="email">
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="user-email">Email</FieldLabel>
                <Input
                  id="user-email"
                  v-bind="field"
                  type="email"
                  placeholder="jane.doe@example.com"
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

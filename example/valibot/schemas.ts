import * as v from 'valibot'
import { Admin, AttributeInput, ButtonComponentType, ComponentInput, DropDownComponentInput, EventArgumentInput, EventInput, EventOptionType, Guest, HttpInput, HttpMethod, LayoutInput, MyType, MyTypeFooArgs, Namer, PageInput, PageType, User } from '../types'

export const ButtonComponentTypeSchema = v.enum_(ButtonComponentType);

export const EventOptionTypeSchema = v.enum_(EventOptionType);

export const HttpMethodSchema = v.enum_(HttpMethod);

export const PageTypeSchema = v.enum_(PageType);

export function AdminSchema(): v.GenericSchema<Admin> {
  return v.object({
    __typename: v.optional(v.literal('Admin')),
    lastModifiedAt: v.nullish(v.any())
  })
}

export function AttributeInputSchema(): v.GenericSchema<AttributeInput> {
  return v.object({
    key: v.nullish(v.string()),
    val: v.nullish(v.string())
  })
}

export function ComponentInputSchema(): v.GenericSchema<ComponentInput> {
  return v.object({
    child: v.lazy(() => v.nullish(ComponentInputSchema())),
    childrens: v.nullish(v.array(v.lazy(() => v.nullable(ComponentInputSchema())))),
    event: v.lazy(() => v.nullish(EventInputSchema())),
    name: v.string(),
    type: ButtonComponentTypeSchema
  })
}

export function DropDownComponentInputSchema(): v.GenericSchema<DropDownComponentInput> {
  return v.object({
    dropdownComponent: v.lazy(() => v.nullish(ComponentInputSchema())),
    getEvent: v.lazy(() => EventInputSchema())
  })
}

export function EventArgumentInputSchema(): v.GenericSchema<EventArgumentInput> {
  return v.object({
    name: v.pipe(v.string(), v.minLength(5)),
    value: v.pipe(v.string(), v.regex(/^foo/, "message"))
  })
}

export function EventInputSchema(): v.GenericSchema<EventInput> {
  return v.object({
    arguments: v.array(v.lazy(() => EventArgumentInputSchema())),
    options: v.nullish(v.array(EventOptionTypeSchema))
  })
}

export function GuestSchema(): v.GenericSchema<Guest> {
  return v.object({
    __typename: v.optional(v.literal('Guest')),
    lastLoggedIn: v.nullish(v.any())
  })
}

export function HttpInputSchema(): v.GenericSchema<HttpInput> {
  return v.object({
    method: v.nullish(HttpMethodSchema),
    url: v.any()
  })
}

export function LayoutInputSchema(): v.GenericSchema<LayoutInput> {
  return v.object({
    dropdown: v.lazy(() => v.nullish(DropDownComponentInputSchema()))
  })
}

export function MyTypeSchema(): v.GenericSchema<MyType> {
  return v.object({
    __typename: v.optional(v.literal('MyType')),
    foo: v.nullish(v.string())
  })
}

export function MyTypeFooArgsSchema(): v.GenericSchema<MyTypeFooArgs> {
  return v.object({
    a: v.nullish(v.string()),
    b: v.number(),
    c: v.nullish(v.boolean()),
    d: v.number()
  })
}

export function NamerSchema(): v.GenericSchema<Namer> {
  return v.object({
    name: v.nullish(v.string())
  })
}

export function PageInputSchema(): v.GenericSchema<PageInput> {
  return v.object({
    attributes: v.nullish(v.array(v.lazy(() => AttributeInputSchema()))),
    date: v.nullish(v.any()),
    height: v.number(),
    id: v.string(),
    layout: v.lazy(() => LayoutInputSchema()),
    pageType: PageTypeSchema,
    postIDs: v.nullish(v.array(v.string())),
    show: v.boolean(),
    tags: v.nullish(v.array(v.nullable(v.string()))),
    title: v.string(),
    width: v.number()
  })
}

export function UserSchema(): v.GenericSchema<User> {
  return v.object({
    __typename: v.optional(v.literal('User')),
    createdAt: v.nullish(v.any()),
    email: v.nullish(v.string()),
    id: v.nullish(v.string()),
    kind: v.lazy(() => v.nullish(UserKindSchema())),
    name: v.nullish(v.string()),
    password: v.nullish(v.string()),
    updatedAt: v.nullish(v.any())
  })
}

export function UserKindSchema() {
  return v.union([AdminSchema(), GuestSchema()])
}

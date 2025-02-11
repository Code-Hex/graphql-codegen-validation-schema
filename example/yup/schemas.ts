import * as yup from 'yup'
import { Admin, AttributeInput, ButtonComponentType, ComponentInput, DropDownComponentInput, EventArgumentInput, EventInput, EventOptionType, Guest, HttpInput, HttpMethod, LayoutInput, MyType, MyTypeFooArgs, Namer, PageInput, PageType, User, UserKind } from '../types'

export const ButtonComponentTypeSchema = yup.string<ButtonComponentType>().oneOf(Object.values(ButtonComponentType)).defined();

export const EventOptionTypeSchema = yup.string<EventOptionType>().oneOf(Object.values(EventOptionType)).defined();

export const HttpMethodSchema = yup.string<HttpMethod>().oneOf(Object.values(HttpMethod)).defined();

export const PageTypeSchema = yup.string<PageType>().oneOf(Object.values(PageType)).defined();

function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
  return yup.mixed<T>().test({
    test: (value) => schemas.some((schema) => schema.isValidSync(value))
  }).defined()
}

export function AdminSchema(): yup.ObjectSchema<Admin> {
  return yup.object({
    __typename: yup.string<'Admin'>().optional(),
    lastModifiedAt: yup.mixed().nullable().optional()
  })
}

export function AttributeInputSchema(): yup.ObjectSchema<AttributeInput> {
  return yup.object({
    key: yup.string().defined().nullable().optional(),
    val: yup.string().defined().nullable().optional()
  })
}

export function ComponentInputSchema(): yup.ObjectSchema<ComponentInput> {
  return yup.object({
    child: yup.lazy(() => ComponentInputSchema()).optional(),
    childrens: yup.array(yup.lazy(() => ComponentInputSchema())).defined().nullable().optional(),
    event: yup.lazy(() => EventInputSchema()).optional(),
    name: yup.string().defined().nonNullable(),
    type: ButtonComponentTypeSchema.nonNullable()
  })
}

export function DropDownComponentInputSchema(): yup.ObjectSchema<DropDownComponentInput> {
  return yup.object({
    dropdownComponent: yup.lazy(() => ComponentInputSchema()).optional(),
    getEvent: yup.lazy(() => EventInputSchema().nonNullable())
  })
}

export function EventArgumentInputSchema(): yup.ObjectSchema<EventArgumentInput> {
  return yup.object({
    name: yup.string().defined().nonNullable().min(5),
    value: yup.string().defined().nonNullable().matches(/^foo/)
  })
}

export function EventInputSchema(): yup.ObjectSchema<EventInput> {
  return yup.object({
    arguments: yup.array(yup.lazy(() => EventArgumentInputSchema().nonNullable())).defined(),
    options: yup.array(EventOptionTypeSchema.nonNullable()).defined().nullable().optional()
  })
}

export function GuestSchema(): yup.ObjectSchema<Guest> {
  return yup.object({
    __typename: yup.string<'Guest'>().optional(),
    lastLoggedIn: yup.mixed().nullable().optional()
  })
}

export function HttpInputSchema(): yup.ObjectSchema<HttpInput> {
  return yup.object({
    method: HttpMethodSchema.nullable().optional(),
    url: yup.mixed().nonNullable()
  })
}

export function LayoutInputSchema(): yup.ObjectSchema<LayoutInput> {
  return yup.object({
    dropdown: yup.lazy(() => DropDownComponentInputSchema()).optional()
  })
}

export function MyTypeSchema(): yup.ObjectSchema<MyType> {
  return yup.object({
    __typename: yup.string<'MyType'>().optional(),
    foo: yup.string().defined().nullable().optional()
  })
}

export function MyTypeFooArgsSchema(): yup.ObjectSchema<MyTypeFooArgs> {
  return yup.object({
    a: yup.string().defined().nullable().optional(),
    b: yup.number().defined().nonNullable(),
    c: yup.boolean().defined().nullable().optional(),
    d: yup.number().defined().nonNullable()
  })
}

export function NamerSchema(): yup.ObjectSchema<Namer> {
  return yup.object({
    name: yup.string().defined().nullable().optional()
  })
}

export function PageInputSchema(): yup.ObjectSchema<PageInput> {
  return yup.object({
    attributes: yup.array(yup.lazy(() => AttributeInputSchema().nonNullable())).defined().nullable().optional(),
    date: yup.mixed().nullable().optional(),
    height: yup.number().defined().nonNullable(),
    id: yup.string().defined().nonNullable(),
    layout: yup.lazy(() => LayoutInputSchema().nonNullable()),
    pageType: PageTypeSchema.nonNullable(),
    postIDs: yup.array(yup.string().defined().nonNullable()).defined().nullable().optional(),
    show: yup.boolean().defined().nonNullable(),
    tags: yup.array(yup.string().defined().nullable()).defined().nullable().optional(),
    title: yup.string().defined().nonNullable(),
    width: yup.number().defined().nonNullable()
  })
}

export function UserSchema(): yup.ObjectSchema<User> {
  return yup.object({
    __typename: yup.string<'User'>().optional(),
    createdAt: yup.mixed().nullable().optional(),
    email: yup.string().defined().nullable().optional(),
    id: yup.string().defined().nullable().optional(),
    kind: yup.lazy(() => UserKindSchema().nullable()).optional(),
    name: yup.string().defined().nullable().optional(),
    password: yup.string().defined().nullable().optional(),
    updatedAt: yup.mixed().nullable().optional()
  })
}

export function UserKindSchema(): yup.MixedSchema<UserKind> {
  return union<UserKind>(AdminSchema(), GuestSchema())
}

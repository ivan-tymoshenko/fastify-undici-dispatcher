'use strict'

const test = require('test')
const assert = require('assert')
const { request, Agent } = require('undici')
const FastifyUndiciDispatcher = require('.')
const Fastify = require('fastify')

test('basic usage', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'hello world'
  })
  await server.ready()

  const dispatcher = new FastifyUndiciDispatcher()
  dispatcher.route('myserver.local', server)

  const res = await request('http://myserver.local/', {
    dispatcher
  })

  assert.strictEqual(await res.body.text(), 'hello world')
})

test('pass-through', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    return 'hello world 2'
  })
  await server.listen({ port: 0 })

  const dispatcher = new FastifyUndiciDispatcher(new Agent())
  t.after(() => dispatcher.close())
  t.after(() => server.close())

  const res = await request(`http://127.0.0.1:${server.addresses()[0].port}/`, {
    dispatcher
  })

  const text = await res.body.text()
  assert.strictEqual(text, 'hello world 2')
})

test('no server found', async (t) => {
  const dispatcher = new FastifyUndiciDispatcher()

  await assert.rejects(request('http://myserver.local/', {
    dispatcher
  }), new Error('No server found for myserver.local'))
})

test('array headers', async (t) => {
  const server = Fastify()
  server.get('/', async (req, reply) => {
    reply.header('x-foo', ['bar', 'baz'])
    return 'hello world'
  })
  await server.ready()

  const dispatcher = new FastifyUndiciDispatcher()
  dispatcher.route('myserver.local', server)

  const res = await request('http://myserver.local/', {
    dispatcher
  })

  assert.deepStrictEqual(res.headers['x-foo'], ['bar', 'baz'])
  assert.strictEqual(await res.body.text(), 'hello world')
})
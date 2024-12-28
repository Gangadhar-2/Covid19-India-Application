let express = require('express')
let {open} = require('sqlite')
let sqlite3 = require('sqlite3')

let path = require('path')
let db_path = path.join(__dirname, 'covid19India.db')
let app = express()
let db = null
app.use(express.json())

let initializeServerAndDb = async () => {
  db = await open({
    filename: db_path,
    driver: sqlite3.Database,
  })
  app.listen(3000, () => {
    console.log('Server is started at http://localhost:3000/')
  })
}

initializeServerAndDb()

let convertCaseState = eachState => {
  return {
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  }
}

let convertSingle = eachState => {
  return {
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  }
}

let convertDistrictCase = each => {
  return {
    districtId: each.district_id,
    districtName: each.district_name,
    stateId: each.state_id,
    cases: each.cases,
    cured: each.cured,
    active: each.active,
    deaths: each.deaths,
  }
}

let statsCase = each => {
  return {
    totalCases: each['sum(cases)'],
    totalCured: each['sum(cured)'],
    totalActive: each['sum(active)'],
    totalDeaths: each['sum(deaths)'],
  }
}

app.get('/states/', async (request, response) => {
  let statesQuery = `select * from state order by state_id`
  let statesOperation = await db.all(statesQuery)
  response.send(statesOperation.map(eachState => convertCaseState(eachState)))
})

app.get('/states/:stateId/', async (request, response) => {
  let {stateId} = request.params
  let particularState = `select * from state where state_id =${stateId}`

  let partcularStateOperation = await db.get(particularState)
  let singleState = convertSingle(partcularStateOperation)
  response.send(singleState)
})

app.post('/districts/', async (request, response) => {
  let requestBody = request.body
  let {districtName, stateId, cases, cured, active, deaths} = requestBody
  let createDistrict = `insert into district (district_name,state_id,cases,cured,active,deaths)
  values('${districtName}',${stateId},${cases},${cured},${active},${deaths});`
  await db.run(createDistrict)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  let {districtId} = request.params
  let paticularDistrict = `select * from district where district_id =${districtId}`

  let partcularDistrictOperation = await db.get(paticularDistrict)
  response.send(convertDistrictCase(partcularDistrictOperation))
})

app.delete('/districts/:districtId/', async (request, response) => {
  let {districtId} = request.params
  let deleteQuery = `delete from district where district_id=${districtId}`
  await db.run(deleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId', async (request, response) => {
  let updateDetails = request.body
  let {districtId} = request.params
  let {districtName, stateId, cases, cured, active, deaths} = updateDetails

  let updateQuery = `update district 
  set district_name= '${districtName}',state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths} 
  where district_id =${districtId};`
  await db.run(updateQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  let {stateId} = request.params
  let statsQuery = `select sum(cases),sum(cured),sum(active),sum(deaths) from district where state_id=${stateId};`
  let statsOperation = await db.get(statsQuery)
  response.send(statsCase(statsOperation))
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `
    select state_id from district
    where district_id = ${districtId};
    ` //With this we will get the state_id using district table
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery)
  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};
    ` //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await db.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
})

module.exports = app

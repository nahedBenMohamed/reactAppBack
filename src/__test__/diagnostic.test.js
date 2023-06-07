
const request = require("supertest");
const appTest = require('../../config/appTestConfig');

let userId = 0;
let childId = 0;
let diagnosisId = 0;
let use_in_profile = 'yes';
let session = '';
let diagnosticId = 0

beforeAll(() => {
  userId = 122
  childId = 689
  diagnosisId = diagnosticId = 2
  use_in_profile = 'yes'
  session = '0776080d6144d387fe7da83bfd020f9206218c8b'
})

describe("GET /diagnostics", () => {
  describe("given a userId", () => {
    test("user sessions : should respond with a 200 status code", async () => {
      const response = await request(appTest).get("/api/v1/diagnostics/sessions/" + userId)
      .query({childId, diagnosisId})
      expect(response.statusCode).toBe(200)
    })
    test("child groups : should respond with a 200 status code", async () => {
      const response = await request(appTest).get("/api/v1/diagnostics/groups").query({childId})
      expect(response.statusCode).toBe(200)
    })
  })
  describe("given a param id & session",  () =>{
    test("diagnostic details : should respond with a 200 status code", async () => {
      const response = await request(appTest).get("/api/v1/diagnostics/" + diagnosisId).query({session})
      expect(response.statusCode).toBe(200)
    })
  })
  describe("given userId, diagnosticId, childId", () => {
    test("create New Session : should respond with a 200 status code", async () => {
      const response = await request(appTest).get("/api/v1/diagnostics/sessions/initial/details").send({
        userId, 
        diagnosticId, 
        childId
      })
      expect(response.statusCode).toBe(201)
    })
  })
  describe("given session, diagnosticId, ", () => {
    test("get Diagnostic Content : should respond with a 200 status code", async () => {
      const response = await request(appTest).get("/api/v1/diagnostics/sessions/content/"+ diagnosticId).query({session})
      expect(response.statusCode).toBe(200)
    })
  })
  describe("given session, diagnosticId, ", () => {
    test("update Diagnostic Content : should respond with a 200 status code", async () => {
      const response = await request(appTest).patch(`/api/v1/diagnostics/sessions/${diagnosticId}/${session}`)
      .send({"status": "finished"})
      .set('Accept', 'application/json');
      expect(response.statusCode).toBe(200)
    })
  })
})
module.exports = appTest;

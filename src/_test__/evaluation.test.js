
const request = require("supertest");
const app = require('../../config/appTestConfig');

let childId = 0;
let session = '';
let use_in_profile = 'yes';
let diagnostics = [];

beforeAll(() => {
  childId = 689
  session = '0776080d6144d387fe7da83bfd020f9206218c8b'
  session_1 = '001d9eb11c28caa98dff3df789ad127812d856ab3976fec39243598585082c5d'
  session_2 = '0776080d6144d387fe7da83bfd020f9206218c8b'
  session_3 = 'e4cff297206d447e2ee4c3b3f15446d71d5e783b'
  session_4 = 'c0e315738d8ee530b37f9d4a4a3905a7420cdb9b'
  session_5 = '0b2456b1d4954bfc205ab690be75f0ed4edf7744'
  session_6 = '8315c8b40b2933cd2d25de0a40da193fab7142d3'
  session_7 = '4690b5ded7e59936f3eda0d6347bd9fc6b667e40'
  session_8 = '9d86a5b2803052f8b13194b4ce568799855c08de'
  session_9 = '09e40c969ee60d0f5e50c607b22644d785ffb8de'
  session_10 = '5224933172240c71c3fb6b913b0c208ec586fe22'
  diagnostics = [1,2,3,4,5,6,7,8,9,10];
  use_in_profile = 'yes'
})

describe("GET /evaluation", () => {
  describe("/evaluation", () => {
    test("GET should respond with a 200 status code", async () => {
      const response = await request(app).get("/api/v1/evaluation").query({childId})
      expect(response.statusCode).toBe(200)
    })
    test("PATCH should respond with a 200 status code", async () => {
      const response = await request(app).patch("/api/v1/evaluation")
      .send({session, use_in_profile})
      .set('Accept', 'application/json');
      expect(response.statusCode).toBe(200)
    }) 
  })
})

describe("GET /evaluation/result", () => {
  describe("given a session : validate score structure", () => {
    diagnostics.forEach(id => {
      test("diagnostic " + id, async () => {
        const response = await request(app).get("/api/v1/evaluation/result").query({session: "session_"+id})
        response.body.data.scores.forEach(score => expect(score.values).toEqual({
          raw_value: expect.any(String),
          score: expect.any(Number),
          tvalue: expect.any(Number),
          confidence_interval: expect.any(String)
        }));
      })
    })
  })
  describe("given a session : validate data length", () => {
    test("diagnostic 1", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_1})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(3)
    })
    test("diagnostic 2", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_2})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(7)
    })
    test("diagnostic 3", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_3})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(2)
    })
    test("diagnostic 4", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_4})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(2)
    })
    test("diagnostic 5", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_5})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(10)
    })
    test("diagnostic 6", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_6})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(2)
    })
    test("diagnostic 7", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_7})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(2)
    })
    test("diagnostic 8", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_8})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(2)
    })
    test("diagnostic 9", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_9})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(4)
    })
    test("diagnostic 10", async () => {
      const response = await request(app).get("/api/v1/evaluation/result").query({session: session_10})
      expect(response.statusCode).toBe(200)
      expect(response.body.data.scores).toHaveLength(3)
    })
  })
})
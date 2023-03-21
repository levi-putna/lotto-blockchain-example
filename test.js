const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('./app');

chai.use(chaiHttp);

describe('API endpoint tests', () => {
  it('should return hello world', (done) => {
    chai.request(app)
      .get('/api/hello')
      .end((err, res) => {
        chai.expect(res).to.have.status(200);
        chai.expect(res.body.message).to.equal('Hello, world!');
        done();
      });
  });

  it('should greet the user by name', (done) => {
    chai.request(app)
      .post('/api/greet')
      .send({ name: 'John' })
      .end((err, res) => {
        chai.expect(res).to.have.status(200);
        chai.expect(res.body.message).to.equal('Hello, John!');
        done();
      });
  });
});
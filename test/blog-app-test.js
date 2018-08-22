'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const faker = require('faker');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {runServer, app, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

//Seed the testing inputs
function seedBlogPostData() {
    console.log('Seeding Blogpost Data');
    const seedData = [];

    for (let i=1; i<10; i++){
        seedData.push(generateBlogPostData());
    }

    return BlogPost.insertMany(seedData);
}

//Generate the fake data
function generateBlogPostData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.company.companyName(),
        content: faker.lorem.sentence(),
        created: faker.date.past()
    }
}

function tearDownDB() {
    console.log('Deleting the database');
    return mongoose.connection.dropDatabase();
}

//Create a mocha test
describe('Blogpost API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });
    beforeEach(function(){
        return seedBlogPostData();
    });
    afterEach(function(){
        return tearDownDB();
    });

    after(function(){
        return closeServer();
    });

    describe('GET endpoint for blogposts', function(){
        it('should retrieve all blogpost data', function(){
            //res is declared here so that it can be called from the following .then function
            let res;
            return chai.request(app).get('/posts').then(_res => {
                //Gets all data return from the GET endpoint and cross check it with the response: status, data type
                res = _res
                expect(res).to.have.status(200);
                console.log(res.body)
                expect(res.body).to.have.lengthOf.at.least(1);
                return BlogPost.count();
            })
            .then(function(count){
                //Here we make sure that the reponse http coresponds with the data model. 
                expect(res.body).to.have.lengthOf(count);
            });
        });

        it('should retrieve all blogpost data with correct field ', function(){
            let resBlogPost;
            return chai.request(app).get('/posts').then(res => {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('array');
                expect(res.body).to.have.lengthOf.at.least(1);

                //Check if we have expected keys in our db
                res.body.forEach(post => {
                    expect(post).to.be.a('object');
                    expect(post).to.include.keys('id', 'author','content','title','created')
                });

                //assign a single result of the body to check it with the db as a return to a chained .then
                resBlogPost = res.body[0];
                return BlogPost.findById(resBlogPost.id)
            }).then(posts => {
                console.log(posts)
                expect(resBlogPost.id).to.equal(posts.id);
                expect(resBlogPost.author).to.equal(posts.authorName);
                expect(resBlogPost.content).to.equal(posts.content);
                expect(resBlogPost.title).to.equal(posts.title);
                // expect(resBlogPost.created).to.equal(posts.created)
            });
        });
    });

    describe('POST endpoint for posts', function(){
        it('should add posts on POST request', function(){
            const newBlogPost = generateBlogPostData();
            return chai.request(app).post('/posts').send(newBlogPost).then(res => {  
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res).to.be.a('object');
                expect(res.body).to.include.keys('id', 'author', 'content','title','created');
                expect(res.body.authorName).to.equal(newBlogPost.authorName);
                expect(res.body.id).to.not.be.null;
                expect(res.body.content).to.equal(newBlogPost.content);
                expect(res.body.title).to.equal(newBlogPost.title);

                return BlogPost.findById(res.body.id)
            }).then(posts => {
                expect(posts.author.firstName).to.equal(newBlogPost.author.firstName);
                expect(posts.author.lastName).to.equal(newBlogPost.author.lastName);
                expect(posts.content).to.equal(newBlogPost.content);
                expect(posts.title).to.equal(newBlogPost.title);
            });
        });
    });

    describe('PUT endpoints', function() {
        it('should update a blogpost on put', () => {
            //we create our own data to update
            const updateData = {
                content: "Nice",
                title: "a title"
            };
            
            BlogPost.findOne().then(post => {
                updateData.id = post.id; 

                return chai.request(app).put(`/posts/${post.id}`).send(updateData).then(() => {
                    expect(res).to.have.status(204);

                    return BlogPost.findById(updateData.id)
                }).then(post => {
                    expect(post.content).to.equal(updateData.content);
                    expect(post.title).to.equal(updateData.title);
                });
            });
              
        });
    });

    describe('DELETE endpoint', function(){
        it('delete a restaurant by id', function(){
            let posts;
            BlogPost.findOne().then(function(_posts){
                posts = _posts
                return chai.request(app).delete(`/posts/${posts.id}`)
                .then((res) => {
                    expect(res).to.have.status(204);

                    return BlogPost.findById(posts.id);
                }).then(post => {
                    expect(post).to.be.null;
                });
            });
        });
    });

});


'use strict';

const {MongoClient, ObjectId} = require('mongodb');

module.exports = function createProjectStore(uri, dbName) {
	let client;
	let db;
	async function getDb() {
		if (!db) {
			client = await MongoClient.connect(uri, {useUnifiedTopology: true});
			// If URI includes db, driver will use it; else use provided dbName or default
			db = client.db(dbName || undefined);
			await ensureIndexes();
		}
		return db;
	}

	async function ensureIndexes() {
		const database = db;
		await database.collection('projects').createIndex({slug: 1}, {unique: true});
		await database.collection('project_tasks').createIndex({projectId: 1, taskId: 1}, {unique: true});
	}

	function slugify(value) {
		return String(value || '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	return {
		async close() {
			if (client) {
				await client.close();
				client = null;
				db = null;
			}
		},
		async ensureProject(name) {
			const database = await getDb();
			const slug = slugify(name) || 'unassigned';
			const now = new Date();
			const update = {
				$setOnInsert: {name, slug, createdAt: now},
				$set: {updatedAt: now}
			};
			const res = await database.collection('projects').findOneAndUpdate(
				{slug}, update, {upsert: true, returnDocument: 'after'}
			);
			return res.value;
		},
		async getAllProjects() {
			const database = await getDb();
			return database.collection('projects').find({}).sort({name: 1}).toArray();
		},
		async getProjectBySlug(slug) {
			const database = await getDb();
			return database.collection('projects').findOne({slug});
		},
		async addTaskToProject(projectId, taskId) {
			const database = await getDb();
			const now = new Date();
			await database.collection('project_tasks').updateOne(
				{projectId: new ObjectId(projectId), taskId: String(taskId)},
				{$setOnInsert: {createdAt: now}},
				{upsert: true}
			);
		},
		async getProjectForTask(taskId) {
			const database = await getDb();
			const map = await database.collection('project_tasks').findOne({taskId: String(taskId)});
			if (!map) return null;
			const proj = await database.collection('projects').findOne({_id: map.projectId});
			return proj;
		},
		async moveTaskToProjectBySlug(taskId, projectSlug) {
			const database = await getDb();
			const project = await database.collection('projects').findOne({slug: projectSlug});
			if (!project) {
				throw new Error('Selected project not found');
			}
			await database.collection('project_tasks').deleteMany({taskId: String(taskId)});
			await database.collection('project_tasks').insertOne({projectId: project._id, taskId: String(taskId), createdAt: new Date()});
			return project;
		},
		async getTaskIdsByProject(projectId) {
			const database = await getDb();
			const docs = await database.collection('project_tasks').find({projectId: new ObjectId(projectId)}).toArray();
			return docs.map(d => d.taskId);
		},
		async getProjectTaskCounts() {
			const database = await getDb();
			const agg = await database.collection('project_tasks').aggregate([
				{$group: {_id: '$projectId', count: {$sum: 1}}}
			]).toArray();
			const map = new Map();
			agg.forEach(row => map.set(String(row._id), row.count));
			return map;
		},
		async getAllMappedTaskIds() {
			const database = await getDb();
			const docs = await database.collection('project_tasks').find({}).project({taskId: 1}).toArray();
			return new Set(docs.map(d => d.taskId));
		}
	};
};

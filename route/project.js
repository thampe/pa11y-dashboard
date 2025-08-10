// This file is part of Pa11y Dashboard.
'use strict';

const presentTask = require('../view/presenter/task');

module.exports = function projectRoutes(app) {
	app.express.get('/project/:slug', (request, response, next) => {
		app.webservice.tasks.get({lastres: true}, async (error, tasks) => {
			if (error) {
				return next(error);
			}
			const slug = request.params.slug;
			let projectName = unslug(slug);
			let filtered = [];
			try {
				if (app.projects) {
					if (slug === 'unassigned') {
						const mapped = await app.projects.getAllMappedTaskIds();
						filtered = tasks.filter(t => !mapped.has(t.id));
					} else {
						const project = await app.projects.getProjectBySlug(slug);
						if (!project) {
							return next();
						}
						projectName = project.name;
						const ids = await app.projects.getTaskIdsByProject(project._id);
						const idSet = new Set(ids);
						filtered = tasks.filter(t => idSet.has(t.id));
					}
				} else {
					// Fallback: show all under Unassigned
					filtered = tasks;
				}
			} catch (e) {
				return next(e);
			}

			response.render('project', {
				tasks: filtered.map(presentTask),
				isProjectPage: true,
				projectName
			});
		});
	});
};

function slugify(name) {
	return String(name || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '') || 'unassigned';
}

function unslug(slug) {
	if (slug === 'unassigned') {
		return 'Unassigned';
	}
	return String(slug || '')
		.replace(/-/g, ' ')
		.replace(/\b\w/g, c => c.toUpperCase());
}

function extractProjectFromName(name) {
	const match = /\[project:\s*([^\]]+)\]\s*$/i.exec(name || '');
	return match ? match[1].trim() : null;
}

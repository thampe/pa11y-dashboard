// This file is part of Pa11y Dashboard.
'use strict';

const presentTask = require('../view/presenter/task');

module.exports = function projectRoutes(app) {
	// Create project form
	app.express.get('/project/new', (request, response, next) => {
		if (!app.projects) {
			return next(new Error('Project store not available'));
		}
		response.render('project-new', {
			isProjectNewPage: true
		});
	});

	// Create project submit
	app.express.post('/project/new', (request, response, next) => {
		if (!app.projects) {
			return next(new Error('Project store not available'));
		}
		const name = (request.body && request.body.name || '').trim();
		if (!name) {
			return response.render('project-new', {error: 'Project name is required', isProjectNewPage: true});
		}
		app.projects.ensureProject(name)
			.then(project => response.redirect(`/project/${project.slug}?added`))
			.catch(next);
	});

	app.express.get('/project/:slug', (request, response, next) => {
		app.webservice.tasks.get({lastres: true}, async (error, tasks) => {
			if (error) {
				return next(error);
			}
			const slug = request.params.slug;
			let projectName = unslug(slug);
			let projectSlug = slug;
			let filtered = [];
            let totals = {error: 0, warning: 0, notice: 0};
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
                // Aggregate totals from last results
                filtered.forEach(t => {
                    const c = t.last_result && t.last_result.count;
                    if (c) {
                        totals.error += c.error || 0;
                        totals.warning += c.warning || 0;
                        totals.notice += c.notice || 0;
                    }
                });
            } catch (e) {
                return next(e);
            }

            response.render('project', {
                tasks: filtered.map(presentTask),
                isProjectPage: true,
                projectName,
                projectSlug: (slug === 'unassigned' ? null : projectSlug),
                totals
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

/* eslint-disable complexity */
// This file is part of Pa11y Dashboard.
//
// Pa11y Dashboard is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Pa11y Dashboard is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Pa11y Dashboard.  If not, see <http://www.gnu.org/licenses/>.
'use strict';

const getStandards = require('../data/standards');
const httpHeaders = require('http-headers');

module.exports = function route(app) {
    app.express.get('/new', (request, response, next) => {
        const standards = getStandards().map(
            standard => {
                if (standard.title === 'WCAG2AA') {
                    standard.selected = true;
                }
                return standard;
            });

        (async () => {
            let projects = [];
            let selectedProject = null;
            try {
                if (app.projects) {
                    projects = await app.projects.getAllProjects();
                }
                // Preselect from query ?project=<slug>
                selectedProject = request.query.project || null;
                projects = projects.map(p => ({
                    name: p.name,
                    slug: p.slug,
                    selected: (selectedProject && p.slug === selectedProject)
                }));
            } catch (e) {}

            response.render('new', {
                standards,
                isNewTaskPage: true,
                projects,
                selectedProject
            });
        })().catch(next);
    });

    app.express.post('/new', (request, response, next) => {
        const parsedActions = parseActions(request.body.actions);
        const parsedHeaders = request.body.headers && httpHeaders(request.body.headers, true);

        const newTask = createNewTask(request, parsedActions, parsedHeaders);

        // Validate project selection
        const selectedSlug = (request.body && request.body.project) || '';
        if (!selectedSlug) {
            return renderNewWithError('Project is required');
        }

        app.webservice.tasks.create(newTask, async (error, task) => {
            if (!error) {
                if (app.projects) {
                    try {
                        const project = await app.projects.getProjectBySlug(selectedSlug);
                        if (!project) {
                            return renderNewWithError('Selected project not found');
                        }
                        await app.projects.addTaskToProject(project._id, task.id);
                    } catch (e) {
                        return next(e);
                    }
                }
                return response.redirect(`/${task.id}?added`);
            }

            const standards = getStandards().map(standard => {
                if (standard.title === newTask.standard) {
                    standard.selected = true;
                }
                standard.rules = standard.rules.map(rule => {
                    if (newTask.ignore.indexOf(rule.name) !== -1) {
                        rule.ignored = true;
                    }
                    return rule;
                });
                return standard;
            });
            newTask.actions = request.body.actions;
            newTask.headers = request.body.headers;
            respondNew(error, standards, newTask);
        });

        function renderNewWithError(message) {
            const standards = getStandards();
            respondNew(message, standards, newTask);
        }

        async function respondNew(error, standards, task) {
            let projects = [];
            try {
                if (app.projects) {
                    projects = await app.projects.getAllProjects();
                }
            } catch (e) {}
            projects = projects.map(p => ({
                name: p.name,
                slug: p.slug,
                selected: (request.body && request.body.project === p.slug)
            }));
            response.render('new', {
                error,
                standards,
                task,
                projects,
                selectedProject: request.body && request.body.project
            });
        }
    });
};

function parseActions(actions) {
	if (actions) {
		return actions.split(/[\r\n]+/)
			.map(action => {
				return action.trim();
			})
			.filter(action => {
				return Boolean(action);
			});
	}
}


function createNewTask({body}, actions, headers) {
	return {
		name: body.name,
		url: body.url,
		standard: body.standard,
		ignore: body.ignore || [],
		timeout: body.timeout || undefined,
		wait: body.wait || undefined,
		actions,
		username: body.username || undefined,
		password: body.password || undefined,
		headers,
		hideElements: body.hideElements || undefined
	};
}

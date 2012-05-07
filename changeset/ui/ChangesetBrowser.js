Ext.define('changeset.ui.ChangesetBrowser', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.changesetbrowser',
    require: ['changeset.ui.ChangesetGrid', 'changeset.ui.Changeset', 'Rally.ui.ComboBox'],
    cls: 'changeset-browser',
    border: 0,
    bodyBorder: false,

    layout: {
        type: 'accordion',
        animate: true
    },

    /**
     * @cfg
     * Adapter to use for retrieving data.
     */
    adapter: null,

    initComponent: function() {
        this.callParent(arguments);
        this._populateToolbar();
    },

    _populateToolbar: function() {
        this.addDocked({
            itemId: 'topToolbar',
            dock: 'top',
            border: 0,
            padding: 5,
            layout: 'hbox',
            items: [{
                xtype: 'rallybutton',
                text: 'Logout',
                handler: function() {
                    this.adapter.logout();
                },
                scope: this
            },{
                xtype: 'changesetfilter',
                margin: '0 0 0 10',
                flex: 1
            }]
        });

        this._addRepoChooser();
    },

    _addRepoChooser: function() {
        var toolbar = this.down('#topToolbar');
        var valueField = 'name';
        this.adapter.getRepositoryStore(function(store) {
            var combo = toolbar.insert(0, {
                xtype: 'rallycombobox',
                margin: '0 5 0 0',
                store: store,
                fieldLabel: 'Repository:',
                labelWidth: 60,
                displayField: valueField,
                listeners: {
                    beforeselect: function(combo, record) {
                        if (record && record.get('name') !== this.adapter.getRepository().name) {
                            this._onRepositorySelect(record);
                        }
                    },
                    scope: this
                }
            });

            store.on('load', function() {
                var repo = this.adapter.getRepository();
                var selectedRepo = repo ? store.findRecord('name', repo.name) : store.getAt(0);
                combo.select(selectedRepo);
                this._onRepositorySelect(selectedRepo);
            }, this, {single: true});
            store.load();
        }, this);
    },

    _onRepositorySelect: function(repository) {
        this.adapter.setRepository(repository);
        this.removeAll();
        this._addBranchChooser();
    },

    _addBranchChooser: function() {
        var toolbar = this.down('#topToolbar');
        var combo = toolbar.down('#branchChooser');
        if (combo) {
            toolbar.remove(combo);
        }

        var valueField = 'name';
        this.adapter.getBranchStore(function(store) {
            combo = toolbar.insert(1, {
                xtype: 'rallycombobox',
                itemId: 'branchChooser',
                margin: '0 5 0 0',
                store: store,
                fieldLabel: 'Branch:',
                labelWidth: 40,
                displayField: valueField,
                listeners: {
                    beforeselect: function(combo, record) {
                        if (record && record.get('name') !== this.adapter.getBranch().name) {
                            this._onBranchSelect(record);
                        }
                    },
                    scope: this
                }
            });

            store.on('load', function() {
                var branch = this.adapter.getBranch();
                var selectedBranch = branch ? store.findRecord('name', branch.name) : store.getAt(0);
                combo.select(selectedBranch);
                this._onBranchSelect(selectedBranch);
            }, this, {single: true});
            store.load();
        }, this);
    },

    _onBranchSelect: function(branch) {
        this.adapter.setBranch(branch);
        this.removeAll();
        this._addGrid();
    },

    _addGrid: function() {
        var callback = function(store) {
            var grid = this.add({
                xtype: 'changesetgrid',
                itemId: 'changeSetGrid',
                margin: '10 0 0 0',
                autoScroll: true,
                model: 'changeset.model.Commit',
                store: store
            });
            grid.setTitle('Commits');
            grid.expand();
            grid.getStore().load();
            this.mon(grid, 'artifactClicked', this._showArtifact, this);
            this.mon(grid, 'revisionClicked', this._showRevision, this);
        };
        this.adapter.getCommitStore(callback, this);
    },

    _showArtifact: function(formattedId) {
        Ext.data.JsonP.request({
            url: Rally.environment.getServer().getWsapiUrl() + '/artifact.js',
            method: 'GET',
            callbackKey: 'jsonp',
            params: {
                query: '(FormattedID = ' + formattedId + ')'
            },
            success: this._onFormattedIdLoad,
            scope: this
        });
    },

    _onFormattedIdLoad: function(result) {
        if (result.QueryResult) {
            var results = result.QueryResult.Results;
            if (results && results.length) {
                var ref = results[0]._ref;
                var detailLink = Rally.util.Navigation.createRallyDetailUrl(ref);
                window.open(detailLink, 'detailpage');
            }
        }
    },

    _showRevision: function(record) {
        if (this.items.getCount() > 1) {
            this.remove(this.items.getAt(1));
        }
        var revision = this.add({
            xtype: 'changeset',
            adapter: this.adapter,
            title: 'Revision: ' + record.get('revision'),
            autoScroll: true,
            record: record
        });
        revision.expand();
    }
});
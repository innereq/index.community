import { orderBy } from 'lodash';
import * as moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import * as sanitize from 'sanitize-html';

import {
    AnchorButton, Card, Classes, Divider, Elevation, HTMLTable, NonIdealState, Position, Tab, Tabs,
    Tooltip
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';

import { selectAndLoadInstance } from '../redux/actions';
import { IAppState, IGraph, IInstanceDetails } from '../redux/types';

interface ISidebarProps {
    graph?: IGraph,
    instanceName: string | null,
    instanceDetails: IInstanceDetails | null,
    isLoadingInstanceDetails: boolean;
    selectAndLoadInstance: (instanceName: string) => void;
}
class SidebarImpl extends React.Component<ISidebarProps> {
    public render() {
        return (
            <Card className="fediverse-sidebar" elevation={Elevation.THREE}>
                {this.renderSidebarContents()}
            </Card>
        )
    }

    private renderSidebarContents = () => {
        if (this.props.isLoadingInstanceDetails) {
            return this.renderLoadingState();
        } else if (!this.props.instanceDetails) {
            return this.renderEmptyState();
        } else if (this.props.instanceDetails.status.toLowerCase().indexOf('personalinstance') > -1) {
            return this.renderPersonalInstanceErrorState();
        } else if (this.props.instanceDetails.status !== 'success') {
            return this.renderMissingDataState();
        }
        return (
            <div>
                {this.renderHeading()}
                <Tabs>
                    {this.props.instanceDetails.description &&
                        <Tab id="description" title="Description" panel={this.renderDescription()} />}
                    {this.shouldRenderStats() &&
                        <Tab id="stats" title="Details" panel={this.renderVersionAndCounts()} />}
                    <Tab id="neighbors" title="Neighbors" panel={this.renderNeighbors()} />
                    <Tab id="peers" title="Known peers" panel={this.renderPeers()} />
                </Tabs>
            </div>
        );
    }

    private shouldRenderStats = () => {
        const details = this.props.instanceDetails;
        return details && (details.version || details.userCount || details.statusCount || details.domainCount);
    }

    private renderHeading = () => {
        let content: JSX.Element;
        if (!this.props.instanceName) {
            content = <span>{"No instance selected"}</span>;
        } else {
            content = (
                <span>
                    {this.props.instanceName + '  '}
                    <Tooltip
                        content="Open link in new tab"
                        position={Position.TOP}
                        className={Classes.DARK}
                    >
                        <AnchorButton icon={IconNames.LINK} minimal={true} onClick={this.openInstanceLink} />
                    </Tooltip>
                </span>
            );
        }
        return (
            <div>
                <h2>{content}</h2>
                <Divider />
            </div>
        );
    }

    private renderDescription = () => {
        const description = this.props.instanceDetails!.description;
        if (!description) {
            return;
        }
        return (
            <p className={Classes.RUNNING_TEXT} dangerouslySetInnerHTML={{__html: sanitize(description)}} />
        )
    }

    private renderVersionAndCounts = () => {
        const version = this.props.instanceDetails!.version;
        const userCount = this.props.instanceDetails!.userCount;
        const statusCount = this.props.instanceDetails!.statusCount;
        const domainCount = this.props.instanceDetails!.domainCount;
        const lastUpdated = this.props.instanceDetails!.lastUpdated;
        return (
            <div>
                <HTMLTable small={true} striped={true} className="fediverse-sidebar-table">
                    <tbody>
                        <tr>
                            <td>Version</td>
                            <td>{<code>{version}</code> || "Unknown"}</td>
                        </tr>
                        <tr>
                            <td>Users</td>
                            <td>{userCount || "Unknown"}</td>
                        </tr>
                        <tr>
                            <td>Statuses</td>
                            <td>{statusCount || "Unknown"}</td>
                        </tr>
                        <tr>
                            <td>Known peers</td>
                            <td>{domainCount || "Unknown"}</td>
                        </tr>
                        <tr>
                            <td>Last updated</td>
                            <td>{moment(lastUpdated + "Z").fromNow() || "Unknown"}</td>
                        </tr>
                    </tbody>
                </HTMLTable>
            </div>
        )
    }

    private renderNeighbors = () => {
        if (!this.props.graph || !this.props.instanceName) {
            return;
        }
        const edges = this.props.graph.edges.filter(e => [e.source, e.target].indexOf(this.props.instanceName!) > -1);
        const neighbors: any[] = [];
        edges.forEach(e => {
            if (e.source === this.props.instanceName) {
                neighbors.push({neighbor: e.target, weight: e.size});
            } else {
                neighbors.push({neighbor: e.source, weight: e.size});
            }
        })
        const neighborRows = orderBy(neighbors, ['weight'], ['desc']).map((neighborDetails: any, idx: number) => (
            <tr key={idx}>
                <td><AnchorButton minimal={true} onClick={this.selectInstance}>{neighborDetails.neighbor}</AnchorButton></td>
                <td>{neighborDetails.weight.toFixed(4)}</td>
            </tr>
        ));
        return (
            <div>
                <p className={Classes.TEXT_MUTED}>
                    The mention ratio is the average of how many times the two instances mention each other per status.
                    A mention ratio of 1 would mean that every single status contained a mention of a user on the other instance.
                </p>
                <HTMLTable small={true} striped={true} interactive={false} className="fediverse-sidebar-table">
                    <thead>
                        <tr>
                        <th>Instance</th>
                        <th>Mention ratio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {neighborRows}
                    </tbody>
                </HTMLTable>
            </div>
        );
    }

    private renderPeers = () => {
        const peers = this.props.instanceDetails!.peers;
        if (!peers || peers.length === 0) {
            return;
        }
        const peerRows = peers.map(instance => (
            <tr key={instance.name} onClick={this.selectInstance}>
                <td><AnchorButton minimal={true} onClick={this.selectInstance}>{instance.name}</AnchorButton></td>
            </tr>
        ));
        return (
            <div>
                <p className={Classes.TEXT_MUTED}>
                    All the instances, past and present, that {this.props.instanceName} knows about.
                </p>
                <HTMLTable small={true} striped={true} interactive={false} className="fediverse-sidebar-table">
                    <tbody>
                        {peerRows}
                    </tbody>
                </HTMLTable>
            </div>
        )
    }

    private renderEmptyState = () => {
        return (
            <NonIdealState
                icon={IconNames.CIRCLE}
                title="No instance selected"
                description="Select an instance from the graph or the top-right dropdown to see its details."
            />
        )
    }

    private renderLoadingState = () => {
        return (
            <div>
                <h4><span className={Classes.SKELETON}>Description</span></h4>
                <p className={Classes.SKELETON}>
                    Eaque rerum sequi unde omnis voluptatibus non quia fugit. Dignissimos asperiores aut incidunt.
                    Cupiditate sit voluptates quia nulla et saepe id suscipit.
                    Voluptas sed rerum placeat consectetur pariatur necessitatibus tempora.
                    Eaque rerum sequi unde omnis voluptatibus non quia fugit. Dignissimos asperiores aut incidunt.
                    Cupiditate sit voluptates quia nulla et saepe id suscipit.
                    Voluptas sed rerum placeat consectetur pariatur necessitatibus tempora.
                </p>
                <h4><span className={Classes.SKELETON}>Version</span></h4>
                <p className={Classes.SKELETON}>
                    Eaque rerum sequi unde omnis voluptatibus non quia fugit.
                </p>
                <h4><span className={Classes.SKELETON}>Stats</span></h4>
                <p className={Classes.SKELETON}>
                    Eaque rerum sequi unde omnis voluptatibus non quia fugit. Dignissimos asperiores aut incidunt.
                    Cupiditate sit voluptates quia nulla et saepe id suscipit.
                    Eaque rerum sequi unde omnis voluptatibus non quia fugit. Dignissimos asperiores aut incidunt.
                    Cupiditate sit voluptates quia nulla et saepe id suscipit.
                </p>
            </div>
        );
    }

    private renderPersonalInstanceErrorState = () => {
        return (
            <NonIdealState
                icon={IconNames.BLOCKED_PERSON}
                title="No data"
                description="This instance has fewer than 5 users and was not crawled."
            />
        )
    }

    private renderMissingDataState = () => {
        return (
            <NonIdealState
                icon={IconNames.ERROR}
                title="No data"
                description="This instance could not be crawled. Either it was down or it's an instance type we don't support yet."
            />
        )
    }

    private openInstanceLink = () => {
        window.open("https://" + this.props.instanceName, "_blank");
    }

    private selectInstance = (e: any) => {
        this.props.selectAndLoadInstance(e.target.innerText);
    }
}

const mapStateToProps = (state: IAppState) => ({
    graph: state.data.graph,
    instanceDetails: state.currentInstance.currentInstanceDetails,
    instanceName: state.currentInstance.currentInstanceName,
    isLoadingInstanceDetails: state.currentInstance.isLoadingInstanceDetails,
});
const mapDispatchToProps = (dispatch: Dispatch) => ({
    selectAndLoadInstance: (instanceName: string) => dispatch(selectAndLoadInstance(instanceName) as any),
});
export const Sidebar = connect(mapStateToProps, mapDispatchToProps)(SidebarImpl);

import { Button, Callout, Classes, H2, Intent, NonIdealState, Spinner } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { push } from "connected-react-router";
import React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import styled from "styled-components";
import { setResultHover, updateSearch } from "../../redux/actions";
import { IAppState, ISearchResultInstance } from "../../redux/types";
import { isSmallScreen } from "../../util";
import { SearchResult } from "../molecules";

const SearchContainer = styled.div`
  align-self: center;
  text-align: center;
  width: 100%;
`;
const SearchBarContainer = styled.div`
  width: 80%;
  margin: 0 auto;
  text-align: center;
`;
const SearchResults = styled.div`
  width: 100%;
`;
const StyledSpinner = styled(Spinner)`
  margin-top: 10px;
`;
const CalloutContainer = styled.div`
  width: 90%;
  margin: 0 auto 20px auto;
  text-align: left;
`;

interface ISearchScreenProps {
  error: boolean;
  isLoadingResults: boolean;
  query: string;
  hasMoreResults: boolean;
  results: ISearchResultInstance[];
  handleSearch: (query: string) => void;
  navigateToInstance: (domain: string) => void;
  setIsHoveringOver: (domain?: string) => void;
}
interface ISearchScreenState {
  currentQuery: string;
}
class SearchScreen extends React.PureComponent<ISearchScreenProps, ISearchScreenState> {
  public constructor(props: ISearchScreenProps) {
    super(props);
    this.state = { currentQuery: "" };
  }

  public componentDidMount() {
    if (this.props.query) {
      this.setState({ currentQuery: this.props.query });
    }
  }

  public render() {
    const { error, hasMoreResults, results, isLoadingResults, query } = this.props;

    if (error) {
      return <NonIdealState icon={IconNames.ERROR} title="Something went wrong." action={this.renderSearchBar()} />;
    } else if (!isLoadingResults && query && results.length === 0) {
      return (
        <NonIdealState
          icon={IconNames.SEARCH}
          title="No search results"
          description="Try searching for something else."
          action={this.renderSearchBar()}
        />
      );
    }

    return (
      <SearchContainer>
        {isSmallScreen && results.length === 0 && this.renderMobileWarning()}
        <H2>Find an instance</H2>
        {this.renderSearchBar()}
        <SearchResults>
          {results.map(result => (
            <SearchResult
              result={result}
              key={result.name}
              onClick={this.selectInstanceFactory(result.name)}
              onMouseEnter={this.onMouseEnterFactory(result.name)}
              onMouseLeave={this.onMouseLeave}
            />
          ))}
          {isLoadingResults && <StyledSpinner size={Spinner.SIZE_SMALL} />}
          {!isLoadingResults && hasMoreResults && (
            <Button onClick={this.search} minimal={true}>
              Load more results
            </Button>
          )}
        </SearchResults>
      </SearchContainer>
    );
  }

  private handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ currentQuery: event.currentTarget.value });
  };

  private handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && this.state.currentQuery !== this.props.query) {
      this.search();
    }
  };

  private search = () => {
    this.props.handleSearch(this.state.currentQuery);
  };

  private selectInstanceFactory = (domain: string) => () => {
    this.props.setIsHoveringOver(undefined);
    this.props.navigateToInstance(domain);
  };

  private onMouseEnterFactory = (domain: string) => () => {
    this.props.setIsHoveringOver(domain);
  };

  private onMouseLeave = () => {
    this.props.setIsHoveringOver(undefined);
  };

  private renderSearchBar = () => (
    <SearchBarContainer className={`${Classes.INPUT_GROUP} ${Classes.LARGE}`}>
      <span className={`${Classes.ICON} bp3-icon-${IconNames.SEARCH}`} />
      <input
        className={Classes.INPUT}
        type="search"
        placeholder="Instance name"
        dir="auto"
        value={this.state.currentQuery}
        onChange={this.handleInputChange}
        onKeyPress={this.handleKeyPress}
      />
    </SearchBarContainer>
  );

  private renderMobileWarning = () => (
    <CalloutContainer>
      <Callout intent={Intent.WARNING} title="Desktop site">
        This is a desktop-optimized site with large visualizations. You can view a simplified version on smaller
        devices, but for the full experience, open it on a computer.
      </Callout>
    </CalloutContainer>
  );
}

const mapStateToProps = (state: IAppState) => ({
  error: state.search.error,
  hasMoreResults: !!state.search.next,
  isLoadingResults: state.search.isLoadingResults,
  query: state.search.query,
  results: state.search.results
});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  handleSearch: (query: string) => dispatch(updateSearch(query) as any),
  navigateToInstance: (domain: string) => dispatch(push(`/instance/${domain}`)),
  setIsHoveringOver: (domain?: string) => dispatch(setResultHover(domain))
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchScreen);

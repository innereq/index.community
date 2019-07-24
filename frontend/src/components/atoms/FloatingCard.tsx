import { Card, Elevation, ICardProps } from "@blueprintjs/core";
import * as React from "react";
import styled from "styled-components";

const FloatingCardRow = styled.div`
  display: flex;
`;
const FloatingCardElement = styled(Card)`
  margin: 0 0 10px 10px;
  z-index: 20;
`;

const FloatingCard: React.FC<ICardProps> = props => (
  <FloatingCardRow>
    <FloatingCardElement elevation={Elevation.ONE} {...props} />
  </FloatingCardRow>
);

export default FloatingCard;

// Copyright (c) 2019 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

jest.mock('./calc-positioning', () => () => ({
  radius: 50,
  svcWidth: 20,
  opWidth: 30,
  svcMarginTop: 10,
}));

/* eslint-disable import/first */
import React from 'react';
import { shallow } from 'enzyme';

import DdgNodeContent from '.';
import { MAX_LENGTH, MAX_LINKED_TRACES, MIN_LENGTH, PARAM_NAME_LENGTH, RADIUS } from './constants';
import * as getSearchUrl from '../../../SearchTracePage/url';

import { ECheckedStatus, EDdgDensity, EDirection, EViewModifier } from '../../../../model/ddg/types';

describe('<DdgNodeContent>', () => {
  const vertexKey = 'some-key';
  const service = 'some-service';
  const operation = 'some-operation';
  const props = {
    focalNodeUrl: 'some-url',
    focusPathsThroughVertex: jest.fn(),
    getGenerationVisibility: jest.fn(),
    getVisiblePathElems: jest.fn(),
    hideVertex: jest.fn(),
    isFocalNode: false,
    operation,
    setViewModifier: jest.fn(),
    service,
    updateGenerationVisibility: jest.fn(),
    vertexKey,
  };

  let wrapper;

  beforeEach(() => {
    props.getGenerationVisibility.mockImplementation(direction =>
      direction === EDirection.Upstream ? ECheckedStatus.Full : ECheckedStatus.Partial
    );
    props.getVisiblePathElems.mockReset();
    props.setViewModifier.mockReset();
    props.updateGenerationVisibility.mockReset();
    wrapper = shallow(<DdgNodeContent {...props} />);
    wrapper.setState({ hovered: true });
  });

  it('does not explode', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('omits the operation if it is null', () => {
    expect(wrapper).toMatchSnapshot();
    wrapper.setProps({ operation: null });
    expect(wrapper).toMatchSnapshot();
  });

  it('renders correctly when isFocalNode = true and focalNodeUrl = null', () => {
    expect(wrapper).toMatchSnapshot();
    wrapper.setProps({ focalNodeUrl: null, isFocalNode: true });
    expect(wrapper).toMatchSnapshot();
  });

  it('renders correctly when not hovered', () => {
    expect(wrapper).toMatchSnapshot();
    wrapper.setState({ hovered: false });
    expect(wrapper).toMatchSnapshot();
  });

  describe('measureNode', () => {
    it('returns twice the RADIUS with a buffer for svg border', () => {
      const diameterWithBuffer = 2 * RADIUS + 2;
      expect(DdgNodeContent.measureNode()).toEqual({
        height: diameterWithBuffer,
        width: diameterWithBuffer,
      });
    });
  });

  describe('hover behavior', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    it('calls setViewModifier on mouse enter', () => {
      wrapper.simulate('mouseenter', { type: 'mouseenter' });

      expect(props.setViewModifier).toHaveBeenCalledTimes(1);
      expect(props.setViewModifier).toHaveBeenCalledWith(vertexKey, EViewModifier.Hovered, true);
    });

    it('calls setViewModifier on mouse leave', () => {
      wrapper.simulate('mouseleave', { type: 'mouseleave' });

      expect(props.setViewModifier).toHaveBeenCalledTimes(1);
      expect(props.setViewModifier).toHaveBeenCalledWith(vertexKey, EViewModifier.Hovered, false);
    });

    it('calls setViewModifier on unmount iff state.hovered is true', () => {
      wrapper.unmount();

      expect(props.setViewModifier).toHaveBeenCalledTimes(1);
      expect(props.setViewModifier).toHaveBeenCalledWith(vertexKey, EViewModifier.Hovered, false);

      // state.hovered is initially false
      const unhoveredWrapper = shallow(<DdgNodeContent {...props} />);
      unhoveredWrapper.unmount();

      expect(props.setViewModifier).toHaveBeenCalledTimes(1);
      expect(props.setViewModifier).toHaveBeenCalledWith(vertexKey, EViewModifier.Hovered, false);
    });

    it('sets state.hovered to true on mouse enter', () => {
      wrapper.setState({ hovered: false });
      wrapper.simulate('mouseenter', { type: 'mouseenter' });

      expect(wrapper.state('hovered')).toBe(true);
    });

    it('sets state.hovered to false on mouse leave, after delay', () => {
      wrapper.simulate('mouseleave', { type: 'mouseleave' });
      expect(wrapper.state('hovered')).toBe(true);

      jest.runAllTimers();
      expect(wrapper.state('hovered')).toBe(false);
    });

    it('cancels delayed set state if mouse re-enters before timeout runs', () => {
      wrapper.simulate('mouseleave', { type: 'mouseleave' });
      expect(wrapper.instance().timeout).toEqual(expect.any(Number));

      wrapper.simulate('mouseenter', { type: 'mouseenter' });
      expect(wrapper.instance().timeout).toBeUndefined();

      jest.runAllTimers();
      expect(wrapper.state('hovered')).toBe(true);
    });
  });

  describe('node interactions', () => {
    describe('focusPaths', () => {
      beforeEach(() => {
        props.focusPathsThroughVertex.mockReset();
      });

      it('calls this.props.focusPathsThroughVertex with this.props.vertexKey', () => {
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .at(2)
          .simulate('click');

        expect(props.focusPathsThroughVertex).toHaveBeenCalledWith(props.vertexKey);
        expect(props.focusPathsThroughVertex).toHaveBeenCalledTimes(1);
      });
    });

    describe('hideVertex', () => {
      beforeEach(() => {
        props.hideVertex.mockReset();
      });

      it('calls this.props.hideVertex with this.props.vertexKey', () => {
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .at(3)
          .simulate('click');

        expect(props.hideVertex).toHaveBeenCalledWith(props.vertexKey);
        expect(props.hideVertex).toHaveBeenCalledTimes(1);
      });
    });

    describe('updateChildren', () => {
      it('calls this.props.updateGenerationVisibility with this.props.vertexKey', () => {
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .at(5)
          .simulate('click');

        expect(props.updateGenerationVisibility).toHaveBeenCalledWith(props.vertexKey, EDirection.Downstream);
        expect(props.updateGenerationVisibility).toHaveBeenCalledTimes(1);
      });
    });

    describe('updateParents', () => {
      it('calls this.props.updateGenerationVisibility with this.props.vertexKey', () => {
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .at(4)
          .simulate('click');

        expect(props.updateGenerationVisibility).toHaveBeenCalledWith(props.vertexKey, EDirection.Upstream);
        expect(props.updateGenerationVisibility).toHaveBeenCalledTimes(1);
      });
    });

    describe('viewTraces', () => {
      const click = () =>
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .at(1)
          .simulate('click');
      const pad = num => `000${num}`.slice(-4);
      const mockReturn = ids =>
        props.getVisiblePathElems.mockReturnValue(ids.map(traceIDs => ({ memberOf: { traceIDs } })));
      const calcIdxWithinLimit = arr => Math.floor(0.75 * arr.length);
      const falsifyDuplicateAndMock = ids => {
        const withFalsyAndDuplicate = ids.map(arr => arr.slice());
        withFalsyAndDuplicate[0].splice(
          calcIdxWithinLimit(withFalsyAndDuplicate[0]),
          0,
          withFalsyAndDuplicate[1][calcIdxWithinLimit(withFalsyAndDuplicate[1])],
          ''
        );
        withFalsyAndDuplicate[1].splice(
          calcIdxWithinLimit(withFalsyAndDuplicate[1]),
          0,
          withFalsyAndDuplicate[0][calcIdxWithinLimit(withFalsyAndDuplicate[0])],
          ''
        );
        mockReturn(withFalsyAndDuplicate);
      };
      const makeIDsAndMock = (idCounts, makeID = count => `test traceID${count}`) => {
        let idCount = 0;
        const ids = idCounts.map(count => {
          const rv = [];
          for (let i = 0; i < count; i++) {
            rv.push(makeID(pad(idCount++)));
          }
          return rv;
        });
        mockReturn(ids);
        return ids;
      };
      let getSearchUrlSpy;
      const lastIDs = () => getSearchUrlSpy.mock.calls[getSearchUrlSpy.mock.calls.length - 1][0].traceID;
      let originalOpen;

      beforeAll(() => {
        originalOpen = window.open;
        window.open = jest.fn();
        getSearchUrlSpy = jest.spyOn(getSearchUrl, 'getUrl');
      });

      beforeEach(() => {
        window.open.mockReset();
      });

      afterAll(() => {
        window.open = originalOpen;
      });

      it('no-ops if there are no elems for key', () => {
        props.getVisiblePathElems.mockReturnValue();
        click();
        expect(window.open).not.toHaveBeenCalled();
      });

      it('opens new tab viewing single traceID from single elem', () => {
        const ids = makeIDsAndMock([1]);
        click();

        expect(lastIDs().sort()).toEqual([].concat(...ids).sort());
        expect(props.getVisiblePathElems).toHaveBeenCalledTimes(1);
        expect(props.getVisiblePathElems).toHaveBeenCalledWith(vertexKey);
      });

      it('opens new tab viewing multiple traceIDs from single elem', () => {
        const ids = makeIDsAndMock([3]);
        click();

        expect(lastIDs().sort()).toEqual([].concat(...ids).sort());
      });

      it('opens new tab viewing multiple traceIDs from multiple elems', () => {
        const ids = makeIDsAndMock([3, 2]);
        click();

        expect(lastIDs().sort()).toEqual([].concat(...ids).sort());
      });

      it('ignores falsy and duplicate IDs', () => {
        const ids = makeIDsAndMock([3, 3]);
        falsifyDuplicateAndMock(ids);
        click();

        expect(lastIDs().sort()).toEqual([].concat(...ids).sort());
      });

      describe('MAX_LINKED_TRACES', () => {
        const ids = makeIDsAndMock([MAX_LINKED_TRACES, MAX_LINKED_TRACES, 1]);
        const expected = [
          ...ids[0].slice(MAX_LINKED_TRACES / 2 + 1),
          ...ids[1].slice(MAX_LINKED_TRACES / 2 + 1),
          ids[2][0],
        ].sort();

        it('limits link to only include MAX_LINKED_TRACES, taking equal from each pathElem', () => {
          mockReturn(ids);
          click();

          expect(lastIDs().sort()).toEqual(expected);
        });

        it('does not count falsy and duplicate IDs towards MAX_LINKED_TRACES', () => {
          falsifyDuplicateAndMock(ids);
          click();

          expect(lastIDs().sort()).toEqual(expected);
        });
      });

      describe('MAX_LENGTH', () => {
        const effectiveMaxLength = MAX_LENGTH - MIN_LENGTH;
        const TARGET_ID_COUNT = 31;
        const paddingLength = Math.floor(effectiveMaxLength / TARGET_ID_COUNT) - PARAM_NAME_LENGTH;
        const idPadding = 'x'.repeat(paddingLength - pad(0).length);
        const ids = makeIDsAndMock([TARGET_ID_COUNT, TARGET_ID_COUNT, 1], num => `${idPadding}${num}`);
        const expected = [
          ...ids[0].slice(TARGET_ID_COUNT / 2 + 1),
          ...ids[1].slice(TARGET_ID_COUNT / 2 + 1),
          ids[2][0],
        ].sort();

        it('limits link to only include MAX_LENGTH, taking equal from each pathElem', () => {
          mockReturn(ids);
          click();

          expect(lastIDs().sort()).toEqual(expected);
        });

        it('does not count falsy and duplicate IDs towards MAX_LEN', () => {
          falsifyDuplicateAndMock(ids);
          click();

          expect(lastIDs().sort()).toEqual(expected);
        });
      });
    });
  });

  describe('DdgNodeContent.getNodeRenderer()', () => {
    const ddgVertex = {
      isFocalNode: false,
      key: 'some-key',
      operation: 'the-operation',
      service: 'the-service',
    };
    const noOp = () => {};

    it('returns a <DdgNodeContent />', () => {
      const ddgNode = DdgNodeContent.getNodeRenderer(
        noOp,
        noOp,
        EDdgDensity.PreventPathEntanglement,
        true,
        'testBaseUrl',
        { maxDuration: '100ms' }
      )(ddgVertex);
      expect(ddgNode).toBeDefined();
      expect(shallow(ddgNode)).toMatchSnapshot();
      expect(ddgNode.type).toBe(DdgNodeContent);
    });

    it('returns a focal <DdgNodeContent />', () => {
      const focalNode = DdgNodeContent.getNodeRenderer(noOp, noOp)({
        ...ddgVertex,
        isFocalNode: true,
      });
      expect(focalNode).toBeDefined();
      expect(shallow(focalNode)).toMatchSnapshot();
      expect(focalNode.type).toBe(DdgNodeContent);
    });
  });
});

/*
 *
 * Copyright (c) 2019-present for NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License ");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import Lock from './lock'
import Constants from '../config/constants'
import { NIP13Service, MultisigService, MetadataService } from '../infrastructure'
import {
  DataSet,
  Timeline,
  getStateFromManagers,
  getGettersFromManagers,
  getMutationsFromManagers,
  getActionsFromManagers
} from './manager'

const managers = [
  new Timeline(
    'timeline',
    () => NIP13Service.getSecuritiesList(Constants.PageSize),
    (key, pageSize) => NIP13Service.getSecuritiesList(pageSize, key),
    'mosaicId'
  ),
  new DataSet(
    'info',
    (securityName) => NIP13Service.getSecurityInfo(securityName)
  ),
  new DataSet(
    'operators',
    (address) => MultisigService.getMultisigAccountInfo(address)
  ),
  new Timeline(
    'metadatas',
    (pageSize, store) => MetadataService.getMosaicMetadataList(store.getters.getCurrentMosaicId, pageSize),
    (key, pageSize, store) => MetadataService.getMosaicMetadataList(store.getters.getCurrentMosaicId, pageSize, key),
    'id',
    10
  )
]

const LOCK = Lock.create()

export default {
  namespaced: true,
  state: {
    ...getStateFromManagers(managers),
    // If the state has been initialized.
    initialized: false,
    currentMosaicId: null,
    currentSecurityName: null,
    currentAccount: null
  },
  getters: {
    ...getGettersFromManagers(managers),
    getInitialized: state => state.initialized,
    // getMosaicRestrictionList: state => state.restrictions?.data.restrictions || [],
    getCurrentMosaicId: state => state.currentMosaicId,
    getCurrentSecurityName: state => state.currentSecurityName,
    getCurrentAccount: state => state.currentAccount
  },
  mutations: {
    ...getMutationsFromManagers(managers),
    setInitialized: (state, initialized) => { state.initialized = initialized },
    setCurrentMosaicId: (state, currentMosaicId) => { state.currentMosaicId = currentMosaicId },
    setCurrentSecurityName: (state, currentSecurityName) => { state.currentSecurityName = currentSecurityName },
    setCurrentAccount: (state, currentAccount) => { state.currentAccount = currentAccount }
  },
  actions: {
    ...getActionsFromManagers(managers),
    // Initialize the mosaic model.
    async initialize({ commit, dispatch, getters }) {
      const callback = async () => {
        await dispatch('initializePage')
      }
      await LOCK.initialize(callback, commit, dispatch, getters)
    },

    // Uninitialize the mosaic model.
    async uninitialize({ commit, dispatch, getters }) {
      const callback = async () => {
        getters.timeline?.uninitialize()
      }
      await LOCK.uninitialize(callback, commit, dispatch, getters)
    },

    // Fetch data from the SDK and initialize the page.
    initializePage(context) {
      context.getters.timeline.setStore(context).initialFetch()
    },

    // Fetch data from the SDK.
    async fetchSecurityInfo(context, securityName) {
      context.dispatch('uninitializeDetail')

      // first fetch mosaic data
      const securityInfo = await NIP13Service.getSecurityInfo(securityName)

      context.commit('setCurrentSecurityName', securityInfo.securityName)
      context.commit('setCurrentMosaicId', securityInfo.mosaicId)
      context.commit('setCurrentAccount', securityInfo.targetAccount)

      context.getters.info.setStore(context).initialFetch(securityName)
      context.getters.operators.setStore(context).initialFetch(securityInfo.targetAccount)
      context.getters.metadatas.setStore(context).initialFetch(securityInfo.mosaicId)
    },

    uninitializeDetail(context) {
      context.getters.info.setStore(context).uninitialize()
      context.getters.operators.setStore(context).uninitialize()
    }
  }
}

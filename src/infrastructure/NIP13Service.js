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

import http from './http'
import helper from '../helper'
import { DataService, NamespaceService } from '../infrastructure'
import { Constants } from '../config'

class NIP13Service {
  /**
  * Gets the SecurityInfo for a given security
  * @param mosaicId -  Mosaic id
  * @returns Formatted MosaicInfo
  */
  static getSecurity = async mosaicId => {
    const mosaic = await http.createRepositoryFactory
      .createMosaicRepository()
      .getMosaic(mosaicId)
      .toPromise()

    return this.formatSecurityInfo(mosaic)
  }

  /**
   * Get formatted SecurityInfo dataset into Vue Component
   * @param hexOrNamespace - hex value or namespace name
   * @returns MosaicInfo info object
   */
  static getSecurityInfo = async (securityName) => {
    const mosaicId = await helper.hexOrNamespaceToId(securityName, 'mosaic')
    const securityInfo = await this.getSecurity(mosaicId)

    return {
      ...securityInfo,
      securityName
    }
  }

  /**
   * Get custom SecurityInfo dataset into Vue Component for NIP13 Securities
   * @param limit — No of namespaceInfo
   * @param fromMosaicId — (Optional) retrive next mosaicInfo in pagination
   * @returns Custom MosaicInfo[]
   */
  static getSecuritiesList = async (limit, fromMosaicId) => {
    const mosaicInfos = await DataService.getMosaicsByIdWithLimit(limit, fromMosaicId)

    const mosaicIdsList = mosaicInfos.map(mosaicInfo => mosaicInfo.id)
    const mosaicNames = await NamespaceService.getMosaicsNames(mosaicIdsList)

    const formattedMosaics = mosaicInfos.map(mosaic => this.formatSecurityInfo(mosaic))

    return formattedMosaics.map(formattedMosaic => ({
      ...formattedMosaic,
      securityName: this.extractSecurityName(formattedMosaic, mosaicNames)
    })).filter(
      v => v.securityName && v.securityName.length &&
           v.securityName.startsWith('nip13')
    )
  }

  /**
   * Format MosaicInfo to readable mosaicInfo object
   * @param MosaicInfoDTO
   * @returns Object readable MosaicInfoDTO object
   */
  static formatSecurityInfo = mosaicInfo => ({
    mosaicId: mosaicInfo.id.toHex(),
    divisibility: mosaicInfo.divisibility,
    targetAccount: mosaicInfo.owner.address.plain(),
    balance: mosaicInfo.supply.compact().toLocaleString('en-US'),
    relativeAmount: helper.formatMosaicAmountWithDivisibility(mosaicInfo.supply, mosaicInfo.divisibility),
    revision: mosaicInfo.revision,
    startHeight: mosaicInfo.height.compact(),
    duration: mosaicInfo.duration.compact() > 0 ? mosaicInfo.duration.compact() : Constants.Message.UNLIMITED,
    supplyMutable: mosaicInfo.flags.supplyMutable,
    transferable: mosaicInfo.flags.transferable,
    restrictable: mosaicInfo.flags.restrictable
  })

  /**
   * Extract Name for Mosaic
   * @param mosaicInfo - mosaicInfo DTO
   * @param mosaicNames - MosaicNames[]
   * @returns mosaicName
   */
  static extractSecurityName = (mosaicInfo, mosaicNames) => {
    let mosaicName = mosaicNames.find((name) => name.mosaicId === mosaicInfo.mosaicId)
    const name = mosaicName.names.length > 0 ? mosaicName.names[0].name : Constants.Message.UNAVAILABLE
    return name
  }
}

export default NIP13Service
